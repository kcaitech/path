import { float_eq, PathCmd, Point, point_eq, Rect, reduice_bbox, Segment } from "./basic";
import { Bezier2, Bezier3 } from "./bezier3";
import { Line } from "./line";


export class Path1 {
    start: Point = { x: 0, y: 0 }
    isClose: boolean = false
    cmds: PathCmd[] = []
    // camp: PathCamp = PathCamp.Subject

    _segments?: Segment[]
    _bbox?: Rect & { x2: number, y2: number }
    segments(): Segment[] {
        if (this._segments) return this._segments;
        let p = this.start;
        const ret: Segment[] = this.cmds.reduce((r, c) => {
            const _p = p;
            p = c;
            switch (c.type) {
                case 'C': {
                    r.push(new Bezier3(_p, { x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }, c))
                    break;
                }
                case 'L': {
                    if (!point_eq(_p, c)) r.push(new Line(_p, c)) // 点可以忽略掉
                    break;
                }
                case 'Q': {
                    r.push(new Bezier2(_p, { x: c.x1, y: c.y1 }, c))
                    break;
                }
            }
            return r;
        }, [] as Segment[])
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

    bbox() {
        if (this._bbox) return this._bbox;
        this._bbox = reduice_bbox(this.segments())
        return this._bbox;
    }
}
