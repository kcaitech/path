import { Grid, SegmentNode } from "./grid";
import { Line } from "./line";
import { contains_range, float_eq, OpType, PathCamp, Point, Rect, rect_contains_point, Segment, splits } from "./basic";
import { Bezier2, Bezier3 } from "./bezier3";
import { objectId } from "./objectid";

type PathCmd =
    { type: "L", x: number, y: number } |
    { type: "Q", x: number, y: number, x1: number, y1: number } |
    { type: "C", x: number, y: number, x1: number, y1: number, x2: number, y2: number }

function reduice_bbox(arr: { bbox(): Rect & { x2: number, y2: number } }[]): Rect & { x2: number, y2: number } {
    if (arr.length === 0) {
        return { x: 0, y: 0, w: 0, h: 0, x2: 0, y2: 0 }
    }
    let bbox: Rect & { x2: number, y2: number } | undefined
    for (let i = 0, len = arr.length; i < len; ++i) {
        const b = arr[i].bbox();
        if (b.w === 0 && b.h === 0) continue;
        if (!bbox) {
            bbox = Object.assign({}, b)
        } else {
            bbox.x = Math.min(bbox.x, b.x);
            bbox.x2 = Math.max(bbox.x2, b.x2);
            bbox.y = Math.min(bbox.y, b.y);
            bbox.y2 = Math.max(bbox.y2, b.y2);
        }
    }
    if (bbox) return bbox;
    return { x: 0, y: 0, w: 0, h: 0, x2: 0, y2: 0 }
}

class Path1 {
    start: Point = { x: 0, y: 0 }
    isClose: boolean = false
    cmds: PathCmd[] = []
    // camp: PathCamp = PathCamp.Subject

    _segments?: Segment[]
    segments(): Segment[] {
        if (this._segments) return this._segments;
        let p = this.start;
        const ret: Segment[] = this.cmds.map(c => {
            const _p = p;
            p = c;
            switch (c.type) {
                case 'C': return new Bezier3(_p, { x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }, c);
                case 'L': return new Line(_p, c);
                case 'Q': return new Bezier2(_p, { x: c.x1, y: c.y1 }, c)
            }
        })
        this._segments = ret;
        if (!this.isClose || ret.length === 0) return ret;

        if ((!float_eq(this.start.x, p.x) || !float_eq(this.start.y, p.y))) {
            ret.push(new Line(p, this.start))
        }
        else if (this.start.x !== p.x || this.start.y !== p.y) {
            // fix
            const s = ret[ret.length - 1];
            if (s.type === 'C') {
                const _s = s as Bezier3;
                ret[ret.length - 1] = new Bezier3(_s.points[0], _s.points[1], _s.points[2], this.start);
            } else if (s.type === 'L') {
                const _s = s as Line;
                ret[ret.length - 1] = new Line(_s.p1, this.start);
            } else {
                const _s = s as Bezier2;
                ret[ret.length - 1] = new Bezier2(_s.points[0], _s.points[1], this.start);
            }
        }
        return ret;
    }
    _bbox?: Rect & { x2: number, y2: number }
    bbox() {
        if (this._bbox) return this._bbox;
        this._bbox = reduice_bbox(this.segments())
        return this._bbox;
    }
}


// 第一级是4*4，子级也都是4*4，最大层级4，最多可将区间分割成65536个区间
// 实际第一级可能扩展

const grid_size = 4;
const grid_max_level = 4;
const grid_need_split = 16;

export class Path {

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
    _subjectNodes?: SegmentNode[]
    _clipNodes?: SegmentNode[]

    addPath(path: Path) {
        this._paths.push(...path._paths);

        const _grid = this._grid;
        if (_grid) {
            path._paths.forEach(p => {
                _grid.adds(p.segments(), p.bbox())
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

    op(path: Path, type: OpType) {
        if (!this._subjectNodes) this._subjectNodes = [];
        const subjectNodes = this._subjectNodes;
        if (!this._grid) {
            const bbox = this.bbox();
            const x = Math.floor(bbox.x)
            const y = Math.floor(bbox.y)
            const x2 = Math.ceil(bbox.x2)
            const y2 = Math.ceil(bbox.y2)
            const _grid = new Grid(x, y, x2 - x, y2 - x, 0, grid_size, grid_size)
            this._grid = _grid;
            this._paths.forEach(p => {
                subjectNodes.push(..._grid.adds(p.segments(), p.bbox()))
            })
        }

        if (this._clipNodes) {
            function tosubject(node: SegmentNode) {
                node.camp = PathCamp.Subject
                // node.childs.forEach(c => tosubject(c))
            }
            this._clipNodes.forEach(n => tosubject(n))
            subjectNodes.push(...this._clipNodes);
        }

        this._clipNodes = []
        const clipNodes = this._clipNodes;
        const _grid = this._grid;

        path._paths.forEach(p => {
            clipNodes.push(..._grid.adds(p.segments(), p.bbox(), PathCamp.Clip))
        })

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
                if (childs.length !== ts.length) throw new Error();
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

        const rm = (rmsubject: (s: SegmentNode, camp: PathCamp) => void, rmclip: (s: SegmentNode, camp: PathCamp) => void) => {
            for (let i = 0, len = subjectNodes.length; i < len; ++i) {
                const s = subjectNodes[i];
                if (s.childs) {
                    s.childs.forEach(s => rmsubject(s, PathCamp.Clip))
                } else {
                    rmsubject(s, PathCamp.Clip)
                }
            }

            for (let i = 0, len = clipNodes.length; i < len; ++i) {
                const s = clipNodes[i];
                if (s.childs) {
                    s.childs.forEach(s => rmclip(s, PathCamp.Subject))
                } else {
                    rmclip(s, PathCamp.Subject)
                }
            }
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

        switch (type) {
            case OpType.Difference:
                rmDiff();
                break;
            case OpType.Union:
                rmUnion();
                break;
            case OpType.Intersection:
                rmIntersection();
                break;
            case OpType.Xor:
                rmDiff();
                break;
        }

        // 根据op重建路径
        // todo
        // 使用现成的grid还是新map

        let saverm: SegmentNode[] | undefined
        if (type === OpType.Xor) {
            // todo

            saverm = removed.slice(0);
            removed.forEach(s => s.removed = false);

            rm(rmoutside, rminside);

            // 重建路径，合并路径
        }

        // 整理grid，以备后续使用

    }

    clone() {

    }

    toSVGString() {

    }

}

export class PathBuilder {
    _paths: Path1[] = []

    moveTo(x: number, y: number) {
        if (this._paths.length === 0 || this._paths[this._paths.length - 1].cmds.length > 0) {
            const np = new Path1();
            np.start.x = x;
            np.start.y = y;
            this._paths.push(np)
        }
    }
    lineTo(x: number, y: number) {

    }
    quadTo(x: number, y: number, x1: number, y1: number) {
    }
    cubicTo(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
    }
    close() {
        if (this._paths.length === 0) return;


    }

    getPath() {
        const path = new Path();
        path._paths = this._paths
        this._paths = []
        return path;
    }
}