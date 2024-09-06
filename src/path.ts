import { Grid, SegmentNode } from "./grid";
import { Line } from "./line";
import { float_eq, OpType, PathCamp, Point, Rect, Segment } from "./basic";
import { Bezier2, Bezier3 } from "./bezier3";

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
                node.childs.forEach(c => tosubject(c))
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


        // todo
        // 查找相交点
        function searchIntersection(node: SegmentNode, level: number) {
            // todo 在level0进行重合判断，后续就不用判断了，
            // 但后续还有其它seg需要判断，所以还是要进行split
            const grid = node.grid;
            if (grid.data.length === 0) throw new Error();
            if (grid.data[0].camp !== grid.data[grid.data.length - 1].camp &&
                grid.data.length > grid_need_split &&
                level < grid_max_level &&
                !grid.items) {
                // 继续分割
                grid.split();
            }

            if (node.childs.length > 0) {
                // todo
                node.childs.forEach(v => {
                    searchIntersection(v, level + 1)
                })
            } else {
                // todo
            }
        }

        clipNodes.forEach(n => {
            searchIntersection(n, 0)
        })

        // todo
        // 断开相交点

        // 根据op重建路径

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

    }
    lineTo(x: number, y: number) {

    }
    quadTo(x: number, y: number, x1: number, y1: number) {

    }
    cubicTo(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {

    }
    close() {

    }

    getPath() {
        const path = new Path();
        path._paths = this._paths
        this._paths = []
        return path;
    }
}