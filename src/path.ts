import { Bezier } from "./bezier";
import { Grid } from "./grid";
import { Line } from "./line";
import { float_eq, PathCamp, Point, Rect, Segment } from "./basic";
import { Bezier2, Bezier3 } from "./bezier3";

type PathCmd =
    { type: "L", x: number, y: number } |
    { type: "Q", x: number, y: number, x1: number, y1: number } |
    { type: "C", x: number, y: number, x1: number, y1: number, x2: number, y2: number }


class Path1 {
    start: Point = { x: 0, y: 0 }
    isClose: boolean = false
    cmds: PathCmd[] = []
    camp: PathCamp = PathCamp.Subject

    _segments?: Segment[]
    toSegments(): Segment[] {
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
        if (this.isClose && ret.length > 0) {
            if ((!float_eq(this.start.x, p.x) || !float_eq(this.start.y, p.y))) {
                ret.push(new Line(p, this.start))
            } else if (this.start.x !== p.x || this.start.y !== p.y) {
                // fix
                const s = ret[ret.length - 1];
                switch (s.type) {
                    case 'C': {
                        const _s = s as Bezier3;
                        ret[ret.length - 1] = new Bezier3(_s.points[0], _s.points[1], _s.points[2], this.start);
                        break;
                    }
                    case 'L': {
                        const _s = s as Line;
                        ret[ret.length - 1] = new Line(_s.p1, this.start);
                        break;
                    }
                    case 'Q': {
                        const _s = s as Bezier2;
                        ret[ret.length - 1] = new Bezier2(_s.points[0], _s.points[1], this.start);
                        break;
                    }
                }
            }
        }
        this._segments = ret;
        return this._segments;
    }
}

enum OpType { Difference, Union, Intersection, Xor }


export class Path {

    _paths: Path1[] = []

    // Bezier曲线，在极值点进行分割，则子路径的bbox就不再需要计算极值点
    // grid及其每个格子，完全包含内部segment，
    // 即segment加入到level 0的grid时，grid需要扩展; segment加入到格子里时需要分割
    // 
    _grid?: Grid<Segment> // for path op

    addPath(path: Path) {
        this._paths.push(...path._paths);

        const _grid = this._grid;
        if (_grid) {
            path._paths.forEach(p => {
                _grid.adds(p.toSegments())
            })
        }
    }

    op(path: Path, type: OpType) {
        // todo
    }

    clone() {

    }

    toSVGString() {

    }

}