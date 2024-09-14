import { Grid, SegmentNode } from "./grid";
import { contains_range, float_accuracy6, float_eq, OpType, PathCamp, PathCmd, Point, point_eq, point_eq6, Rect, reduice_bbox, Segment, splits } from "./basic";
import { objectId } from "./objectid";
import { Path1 } from "./path1";
import { parsePath } from "./pathparser";


// 第一级是4*4，子级也都是4*4，最大层级4，最多可将区间分割成65536个区间
// 实际第一级可能扩展

const grid_size = 4;
const grid_max_level = 4;
const grid_need_split = 16;

export class Path {

    static fromSVGString(path: string): Path {
        const paths = parsePath(path);
        const p = new Path();
        p._paths = paths;
        return p;
    }

    // color = 0
    _paths: Path1[] = []

    _bbox?: Rect & { x2: number, y2: number }
    bbox() {
        if (this._bbox) return this._bbox;
        this._bbox = reduice_bbox(this._paths)
        return this._bbox;
    }

    // Bezier曲线，在极值点进行分割，则子路径的bbox就不再需要计算极值点
    // grid及其每个格子，完全包含内部segment，
    // 即segment加入到level 0的grid时，grid需要扩展; segment加入到格子里时需要分割
    // 
    _grid?: Grid // for path op
    // _subjectNodes?: SegmentNode[]
    // _clipNodes?: SegmentNode[]
    _grid_dirty?: boolean // 需要修复

    addPath(path: Path) {
        this._paths.push(...path._paths);

        const _grid = this._grid;
        if (_grid) {
            this._op_fix_grid();
            path._paths.forEach(p => {
                // 非close的路径不参与op
                if (p.isClose) _grid.adds(p.segments(), p.bbox())
            })
        }

        if (this._bbox) {
            const b = path.bbox();
            const b1 = this._bbox;
            b1.x = Math.min(b1.x, b.x);
            b1.x2 = Math.max(b1.x2, b.x2);
            b1.y = Math.min(b1.y, b.y);
            b1.y2 = Math.max(b1.y2, b.y2);
            b1.w = b1.x2 - b1.x
            b1.h = b1.y2 - b1.y
        }
    }

    private _op_fix_grid() {
        // 复用grid以
        // op grid要复用，得
        // 1. 清除掉removed，对应的parent要清理
        // 2. 重置coincident
        // 3. 新加入的（reverse）要加入到grid
        // 直接做法是对比新生成的path的segment与grid中的segment,去除多余的，加入缺少的，同时重置状态

        if (!this._grid_dirty || !this._grid) return;

        const grid = this._grid;
        const segset = new Set<number>();
        // 清除多余segmentnode
        this._paths.forEach(p => {
            if (p.isClose) p.segments().forEach(s => segset.add(objectId(s)))
        })

        const segset2 = new Set<number>();
        grid.data.slice(0).forEach(d => {
            if (!segset.has(objectId(d.seg))) grid.rm(d);
            else segset2.add(objectId(d.seg))
        })

        // 加入新增segment
        this._paths.forEach(p => {
            if (p.isClose) p.segments().forEach(s => {
                if (!segset2.has(objectId(s))) grid.add(s)
            })
        })

        // 清除状态
        grid.data.forEach(d => {
            d.childs = undefined;
            d.camp = PathCamp.Subject;
            d.coincident = undefined;
            d.removed = undefined;
            d.parent = undefined;
        })

        this._grid_dirty = undefined;
    }

    private _op_prepare_grid(path: Path) {
        let subjectNodes: SegmentNode[];
        if (!this._grid) {
            const bbox = this.bbox();
            const x = Math.floor(bbox.x)
            const y = Math.floor(bbox.y)
            const x2 = Math.ceil(bbox.x2)
            const y2 = Math.ceil(bbox.y2)
            const _grid = new Grid(x, y, x2 - x + 1, y2 - x + 1, 0, grid_size, grid_size)
            this._grid = _grid;
            subjectNodes = []
            this._paths.forEach(p => {
                if (p.isClose) subjectNodes.push(..._grid.adds(p.segments(), p.bbox()))
            })
        } else {
            this._op_fix_grid();
            subjectNodes = this._grid.data.slice(0)
        }

        const clipNodes: SegmentNode[] = [];
        const _grid = this._grid;

        path._paths.forEach(p => {
            if (p.isClose) clipNodes.push(..._grid.adds(p.segments(), p.bbox(), PathCamp.Clip))
        })

        return { grid: _grid, subjectNodes, clipNodes }
    }

    private _op_prepare_segments(clipNodes: SegmentNode[], _grid: Grid) {

        // 查找相交点
        function searchIntersection(clipNode: SegmentNode, grid: Grid, level: number, subjectNodes: Map<number, SegmentNode>) {

            if (!grid.dataMap.has(objectId(clipNode))) return;

            if (grid.data.length === 0) throw new Error();
            if (grid.data[0].camp !== grid.data[grid.data.length - 1].camp &&
                grid.data.length > grid_need_split &&
                level < grid_max_level &&
                !grid.items) {
                // 继续分割
                grid.split();
            }

            if (grid.items) {
                grid.items.forEach(g => {
                    searchIntersection(clipNode, g, level + 1, subjectNodes)
                })
            } else {
                grid.data.forEach(d => {
                    if (d.camp === PathCamp.Subject) subjectNodes.set(objectId(d), d)
                })
            }
        }

        const intersects: { clipNode: SegmentNode, subjectNodes: Map<number, SegmentNode> }[] = []
        clipNodes.forEach(n => {
            const subjectNodes: Map<number, SegmentNode> = new Map();
            // 查找n.seg存在的所有Subject路径
            searchIntersection(n, _grid, 0, subjectNodes);
            if (subjectNodes.size > 0) intersects.push({ clipNode: n, subjectNodes })
        })


        const splitenode = (node: SegmentNode, ts: number[]) => {
            // ts = ts.filter((t) => !(float_eq(0, t) && float_eq(1, t))).sort((a, b) => a - b)
            if (ts.length === 0) return;
            if (!node.childs) {
                const childs = splits(node.seg, ts);
                ts = ts.slice(0);
                ts.push(1);
                if (childs.length !== ts.length) {
                    console.log(ts, childs)
                    throw new Error();
                }
                node.childs = []
                let pt = 0
                ts.forEach((t, i) => {
                    const n = {
                        t0: pt, t1: t, camp: node.camp, seg: childs[i]
                    }
                    node.childs!.push(n)
                    pt = t
                })
                return;
            }

            const curt: number[] = []
            node.childs.forEach(c => {
                curt.push(c.t0, c.t1)
            })

            ts = ts.filter((t) => curt.indexOf(t) < 0)
            if (ts.length === 0) return;

            for (let i = 0, len = node.childs.length; i < len && ts.length > 0; ++i) {
                const t = ts[0];
                const c = node.childs[i];
                if (t > c.t0 && t < c.t1) {
                    ts.unshift()
                    const sp = c.seg.split((t - c.t0) / (c.t1 - c.t0))
                    node.childs.splice(i, 1, { t0: c.t0, t1: t, camp: c.camp, seg: sp[0] }, { t0: t, t1: c.t1, camp: c.camp, seg: sp[1] })
                    len = node.childs.length;
                }
            }
        }

        const markstate = (node: SegmentNode, t0: number, t1: number, state: 'coincident' | 'removed') => {
            const ret: SegmentNode[] = []
            // if (ts.length === 0) {
            //     node[state] = true;
            //     ret.push(node)
            //     return ret;
            // }
            if (!node.childs) throw new Error()

            if (t0 < t1) {
                const t = t0;
                t0 = t1;
                t1 = t;
            }

            node.childs.forEach(c => {
                if (contains_range(t0, t1, c.t0, c.t1)) {
                    c[state] = true;
                    ret.push(c)
                }
            })
            return ret;
        }

        const coincidents: SegmentNode[] = []

        // 断开重合点、相交点
        for (let i = 0, len = intersects.length; i < len; ++i) {
            const intersect = intersects[i];
            const clipNode = intersect.clipNode;
            const clip = clipNode.seg;

            for (let [k, v] of intersect.subjectNodes) {
                const subject = v.seg;
                const coincident = clip.coincident(subject);
                if (coincident) {
                    const { t0, t1, t2, t3 } = coincident;
                    const clipsplit = [t0, t1].filter((t) => !(float_eq(0, t) && float_eq(1, t))).sort((a, b) => a - b)
                    const subjectsplit = [t2, t3].filter((t) => !(float_eq(0, t) && float_eq(1, t))).sort((a, b) => a - b)
                    splitenode(clipNode, clipsplit);
                    splitenode(v, subjectsplit);

                    coincidents.push(...markstate(clipNode, t0, t1, "coincident"))
                    coincidents.push(...markstate(v, t2, t3, "coincident"))
                    continue;
                }

                const intersect = clip.intersect(subject, true) as { type: "intersect", t0: number, t1: number }[];

                if (intersect.length > 0) {

                    intersect.forEach(v1 => {
                        splitenode(clipNode, [v1.t0])
                        splitenode(v, [v1.t1])
                    })

                    continue;
                }
            }
        }
    }

    private _op_rm_segments(type: OpType, subjectNodes: SegmentNode[], clipNodes: SegmentNode[], _grid: Grid) {
        // evenodd
        // even true, odd false
        const evenodd = (seg: SegmentNode, camp: PathCamp): boolean => {
            const p = seg.seg.pointAt(0.5);
            return _grid.evenodd(p, camp);
        }

        // 根据op标记removed segment
        // a. difference: Subject的线段在Clip内标记删除，Clip的线段在Subject外标记删除
        // b. union: Subject的线段在Clip内标记删除，Clip的线段在Subject内标记删除
        // c. intersection: Subject的线段在Clip外标记删除，Clip的线段在Subject外标记删除
        // d. exclude(Xor): difference(Subject, Clip) + difference(Clip, Subject)；

        const removed: SegmentNode[] = []; // xor需要重复使用

        const rminside = (s: SegmentNode, camp: PathCamp) => {
            if (s.coincident) return; // 共线另外处理
            if (evenodd(s, camp)) {
                s.removed = true;
                removed.push(s)
            }
        }

        const rmoutside = (s: SegmentNode, camp: PathCamp) => {
            if (s.coincident) return; // 共线另外处理
            if (!evenodd(s, camp)) {
                s.removed = true;
                removed.push(s)
            }
        }

        const rm1 = (subjectNodes: SegmentNode[], rmsubject: (s: SegmentNode, camp: PathCamp) => void) => {
            if (subjectNodes.length === 0) return;
            // swap camp
            const s0camp = subjectNodes[0].camp;
            const camp = s0camp === PathCamp.Clip ? PathCamp.Subject : PathCamp.Clip;
            for (let i = 0, len = subjectNodes.length; i < len; ++i) {
                const s = subjectNodes[i];
                if (s.childs) {
                    s.childs.forEach(s => rmsubject(s, camp))
                } else {
                    rmsubject(s, camp)
                }
            }
        }

        const rm = (rmsubject: (s: SegmentNode, camp: PathCamp) => void, rmclip: (s: SegmentNode, camp: PathCamp) => void) => {
            rm1(subjectNodes, rmsubject);
            rm1(clipNodes, rmclip);
        }

        const rmDiff = () => {
            rm(rminside, rmoutside)
        }

        const rmUnion = () => {
            rm(rminside, rminside)
        }

        const rmIntersection = () => {
            rm(rmoutside, rmoutside)
        }

        // 处理重合路径
        // 7. 共线处理</br>
        // difference: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如同时在或者同时不在Subject和Clip中，则标记删除</br>
        // union: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中，则标记删除</br>
        // intersection: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中，则标记删除</br>
        // *同时在或者同时不在，是指填充重合的区域的边，反之则是不重合的边。即difference重合部分要去除，union和intersection重合部分要保留</br>

        const rmClipCoin = (subjectNodes: SegmentNode[]) => {
            if (subjectNodes.length === 0) return;
            for (let i = 0, len = subjectNodes.length; i < len; ++i) {
                const s = subjectNodes[i];
                if (s.childs) {
                    rmClipCoin(s.childs)
                } else if (s.coincident) {
                    s.removed = true;
                    removed.push(s)
                }
            }
        }


        const coinjudge1 = (seg: SegmentNode) => { // 同时在
            return evenodd(seg, PathCamp.Clip) === evenodd(seg, PathCamp.Subject)
        }
        const coinjudge2 = (seg: SegmentNode) => { // 不同时在
            return evenodd(seg, PathCamp.Clip) !== evenodd(seg, PathCamp.Subject)
        }
        const rmSubjectCoin = (subjectNodes: SegmentNode[], judge: (seg: SegmentNode) => boolean) => {
            if (subjectNodes.length === 0) return;
            for (let i = 0, len = subjectNodes.length; i < len; ++i) {
                const s = subjectNodes[i];
                if (s.childs) {
                    rmSubjectCoin(s.childs, judge)
                } else if (s.coincident && judge(s)) {
                    s.removed = true;
                    removed.push(s)
                }
            }
        }

        switch (type) {
            case OpType.Difference:
                rmDiff();
                rmSubjectCoin(subjectNodes, coinjudge1);
                break;
            case OpType.Union:
                rmUnion();
                rmSubjectCoin(subjectNodes, coinjudge2);
                break;
            case OpType.Intersection:
                rmIntersection();
                rmSubjectCoin(subjectNodes, coinjudge2);
                break;
            case OpType.Xor:
                rmDiff();
                rmSubjectCoin(subjectNodes, coinjudge1);
                break;
        }

        rmClipCoin(clipNodes);

        return removed;
    }

    private _op_rebuild_paths(subjectNodes: SegmentNode[], clipNodes: SegmentNode[]) {
        const brokensegments: Map<number, Map<number, Segment[][]>> = new Map();
        const closedsegments: Segment[][] = [];
        let cursegments: Segment[] = []

        const addbrokensegments = (p: Point, segments: Segment[]) => {
            const px = Math.round(p.x / float_accuracy6);
            const py = Math.round(p.y / float_accuracy6);
            let x = brokensegments.get(px)
            if (!x) {
                x = new Map<number, Segment[][]>()
                brokensegments.set(px, x)
            }
            let y = x.get(py);
            if (!y) {
                y = [];
                x.set(py, y);
            }
            y.push(segments);
        }

        const isclosed = (cursegments: Segment[]) => {
            if (cursegments.length === 0) return false;
            if (cursegments.length === 1 && cursegments[0].type !== 'L') {
                // 自己闭合
                const s0 = cursegments[0];
                if (point_eq(s0.from, s0.to)) return true;
                return false;
            }
            const s0 = cursegments[0];
            const s1 = cursegments[cursegments.length - 1];
            if (point_eq(s0.from, s1.to)) return true;
            return false;
        }

        const rebuild1 = (nodes: SegmentNode[]) => {
            for (let i = 0, len = nodes.length; i < len; ++i) {
                const n = nodes[i];
                if (n.childs) {
                    rebuild1(n.childs)
                    continue;
                }
                if (n.removed) {
                    continue;
                }
                const pre = cursegments[cursegments.length - 1];
                if (!pre) {
                    cursegments.push(n.seg)
                } else if (point_eq(pre.to, n.seg.from)) {
                    cursegments.push(n.seg)
                } else {
                    if (isclosed(cursegments)) {
                        closedsegments.push(cursegments)
                        cursegments = []
                    } else {
                        const from = cursegments[0].from;
                        const to = cursegments[cursegments.length - 1].to;
                        addbrokensegments(from, cursegments);
                        addbrokensegments(to, cursegments);
                        cursegments = [];
                    }
                    cursegments.push(n.seg)
                }
                if (isclosed(cursegments)) {
                    closedsegments.push(cursegments)
                    cursegments = []
                }
            }
        }

        const rebuild = (nodes: SegmentNode[]) => {
            rebuild1(nodes);
            if (cursegments.length === 0) {
                // none
            } else if (isclosed(cursegments)) {
                closedsegments.push(cursegments)
                cursegments = []
            } else {
                const from = cursegments[0].from;
                const to = cursegments[cursegments.length - 1].to;
                addbrokensegments(from, cursegments);
                addbrokensegments(to, cursegments);
                cursegments = [];
            }
        }

        // 根据op重建路径
        // 在一个顶点有多条路径时，优先选择往内拐的（最小面积），最后成了各个独立的path</br>
        // difference: 遍历完所有未删除的Subject和Clip</br>
        // union: 遍历完所有未删除的Subject和Clip</br>
        // intersection: 遍历完所有未删除的Subject和Clip</br>
        rebuild(subjectNodes)
        rebuild(clipNodes)

        // join brokensegments
        const joinedsegments: Segment[][] = [];
        let curjoin: Segment[] = [];
        const usedsegments = new Set<number>();

        const reverse = (segs: Segment[]) => {
            return segs.reverse().map(s => s.reverse()) // 原有的seg被替換，grid還能用不？
        }

        const getjoinsegs = (to: Point) => {
            const x = brokensegments.get(Math.round(to.x / float_accuracy6))
            if (!x) return;

            const y = x.get(Math.round(to.y / float_accuracy6))
            if (!y || y.length === 0) return;

            const pending = y.filter(s => !usedsegments.has(objectId(s)))
            return pending.length > 0 ? pending : undefined;
        }

        const joinsegs1 = () => {
            if (isclosed(curjoin)) return false;

            const from = curjoin[0].from;
            const to = curjoin[curjoin.length - 1].to;
            // let joined = false;

            const pending = getjoinsegs(to) || getjoinsegs(from);

            if (!pending) return false;

            if (pending.length === 1) {
                const seg = pending[0];
                usedsegments.add(objectId(seg))

                const segfrom = seg[0].from;
                const segto = seg[seg.length - 1].to;

                if (point_eq6(to, segfrom)) {
                    curjoin.push(...seg)
                } else if (point_eq6(to, segto)) {
                    curjoin.push(...reverse(seg))
                } else if (point_eq6(segto, from)) {
                    curjoin.unshift(...seg)
                } else {
                    curjoin.unshift(...reverse(seg))
                }
            }

            if (pending.length > 1) {
                // todo
                // 优先相同camp
                // 其次内外面与当前路径一致
                // 
                // 在一个顶点有多条路径时，优先选择往内拐的（最小面积），最后成了各个独立的path</br>
                throw new Error();
            }
            return true;
        }

        const joinsegs = () => {

            while (joinsegs1());

        }

        for (let [k, v] of brokensegments) {
            for (let [k1, v1] of v) {
                for (let i = 0, len = v1.length; i < len; ++i) {
                    const segs = v1[i];
                    if (usedsegments.has(objectId(segs))) continue;
                    usedsegments.add(objectId(segs))
                    if (curjoin.length > 0) throw new Error();
                    curjoin.push(...segs);
                    joinsegs()

                    if (isclosed(curjoin)) {
                        closedsegments.push(curjoin)
                        curjoin = []
                    } else {
                        joinedsegments.push(curjoin)
                        curjoin = [];
                    }
                }
            }
        }
        return { closedsegments, joinedsegments }
    }

    private _op_rebuild_paths2(closedsegments: Segment[][], joinedsegments: Segment[][]) {
        for (let i = 0, len = closedsegments.length; i < len; ++i) {
            const segs = closedsegments[i];
            const from = segs[0].from;
            const path = new Path1();
            path.start.x = from.x;
            path.start.y = from.y;
            path.isClose = true;
            path._segments = []
            for (let j = 0, len = segs.length; j < len; ++j) {
                const s = segs[j];
                if (j === len - 1 && s.type === 'L') break;
                path._segments.push(s);
                path.cmds.push(s.toCmd())
            }
            this._paths.push(path)
        }
        // joinedsegments
        for (let i = 0, len = joinedsegments.length; i < len; ++i) {
            const segs = joinedsegments[i];
            const from = segs[0].from;
            const path = new Path1();
            path.start.x = from.x;
            path.start.y = from.y;
            // path.isClose = true;
            path._segments = []
            for (let j = 0, len = segs.length; j < len; ++j) {
                const s = segs[j];
                // if (j === len - 1 && s.type === 'L') break;
                path._segments.push(s);
                path.cmds.push(s.toCmd())
            }
            this._paths.push(path)
        }
    }

    op(path: Path, type: OpType) {

        const { grid: _grid, subjectNodes, clipNodes } = this._op_prepare_grid(path);

        this._op_prepare_segments(clipNodes, _grid);

        const removed: SegmentNode[] = this._op_rm_segments(type, subjectNodes, clipNodes, _grid);

        const { closedsegments, joinedsegments } = this._op_rebuild_paths(subjectNodes, clipNodes);

        // 生成路徑
        // 生成新_paths
        this._bbox = undefined;
        this._paths.length = 0;
        this._op_rebuild_paths2(closedsegments, joinedsegments)

        if (type === OpType.Xor) {
            removed.forEach(s => s.removed = false);
            // 重建路径，合并路径
            this._op_rm_segments(type, clipNodes, subjectNodes, _grid);
            const { closedsegments, joinedsegments } = this._op_rebuild_paths(subjectNodes, clipNodes);
            this._op_rebuild_paths2(closedsegments, joinedsegments)
        }

        this._grid_dirty = true;
    }

    clone() {
        const path = new Path()
        path._paths = this._paths;
        return path;
    }

    toSVGString() {
        let ret = ''
        this._paths.forEach(p => {
            ret += `M${p.start.x} ${p.start.y}`
            p.cmds.forEach(c => {
                switch (c.type) {
                    case 'C': ret += `C${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`; break;
                    case 'L': ret += `L${c.x} ${c.y}`; break;
                    case 'Q': ret += `Q${c.x1} ${c.y1} ${c.x} ${c.y}`; break;
                }
            })
            if (p.isClose) ret += 'Z'
        })
        return ret;
    }

}
