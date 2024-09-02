import { Line } from "./line";
import { Point, Rect, Segment } from "./basic"

const ZERO = { x: 0, y: 0 };

abstract class Bezier implements Segment {
    points: Point[]

    // todo
    discrete?: Line[]
    d: number = 1 / 20; // 默认分割20份
    color?: number
    origin?: {
        segment: Segment,
        t0: number,
        t1: number
    }

    abstract get type(): "Q" | "C";

    constructor(p0: Point, p1: Point, p2: Point)
    constructor(p0: Point, p1: Point, p2: Point, p3: Point)
    constructor(...points: Point[]) {
        this.points = points
    }

    abstract extrema(): number[];

    _bbox?: Rect
    bbox(): Rect {
        if (this._bbox) return this._bbox;
        const extrema = this.extrema();
        const p0 = this.points[0];
        const p2 = this.points[2];
        let minx = p0.x;
        let miny = p0.y;
        let maxx = minx;
        let maxy = miny;
        extrema.map(this.pointAt.bind(this)).concat([p2]).forEach(p => {
            minx = Math.min(minx, p.x);
            maxx = Math.max(maxx, p.x);
            miny = Math.min(miny, p.y);
            maxy = Math.max(maxy, p.y);
        })
        this._bbox = { x: minx, y: miny, w: maxx - minx, h: maxy - miny }
        return this._bbox;
    }

    pointAt(t: number): Point {
        const points = this.points;
        // shortcuts
        if (t === 0) {
            return (points[0]);
        }

        const order = points.length - 1;
        if (order !== 2 && order !== 3) throw new Error("order: " + order);

        if (t === 1) {
            return (points[order]);
        }

        // quadratic/cubic curve?
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        let a,
            b,
            c,
            d = 0;
        let p = points;
        if (order === 2) { // Q
            p = [p[0], p[1], p[2], ZERO];
            a = mt2;
            b = mt * t * 2;
            c = t2;
        } else { // C
            a = mt2 * mt;
            b = mt2 * t * 3;
            c = mt * t2 * 3;
            d = t * t2;
        }
        const ret: Point = {
            x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
            y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
        };
        return ret;
    }

    intersect(seg: Segment): { t0: number; t1: number; }[] {
        switch (seg.type) {
            case 'L':
            case 'Q':
            case 'C':
        }
        throw new Error("Method not implemented.");
    }

    split(t: number): Bezier[] {
        throw new Error("Method not implemented.");
    }
}

export class Bezier2 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point) {
        super(p0, p1, p2)
    }

    get type(): "Q" {
        return "Q"
    }

    // Bzier2(t) = P0*(1-t)^2 + 2*P1*(1-t)*t + P2*t^2
    // Bzier2'(t) = 2*(1-t)*(P1-P0) + 2*t*(P2-P1) = 2*t*(P2-2*P1+P0)+2*(P1-P0) 直线方程.
    // t = (P1-P0)/(P2-2*P1+P0)时取得极值
    extrema() {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const d = (dim: 'x' | 'y') => {
            return p2[dim] - 2 * p1[dim] + p0[dim];
        }
        const ret: number[] = [];
        const dx = d('x');
        const dy = d('y');

        const t = (dim: 'x' | 'y', d: number) => {
            return (p1[dim] - p0[dim]) / d;
        }
        if (dx !== 0) ret.push(t('x', dx));
        if (dy !== 0) ret.push(t('y', dy));

        const accept = (t: number, i: number) => {
            return t >= 0 && t <= 1 && ret.indexOf(t) === i;
        }
        return ret.filter(accept).sort((a, b) => a - b)
    }
}

export class Bezier3 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point, p3: Point) {
        super(p0, p1, p2, p3)
    }

    // 需要转换为线段进行相交、等计算

    get type(): "C" {
        return "C"
    }

    // Pascal's triangle
    //    1      n=0
    //   1 1     n=1
    //  1 2 1    n=2
    // 1 3 3 1   n=3
    // Bzier3(t) = P0*(1-t)^3 + 3*P1*(1-t)^2*t + 3*P2*(1-t)*t^2 + P3*t^3
    // Bezier3'(t) = 3*(P1-P0)*(1-t)^2 + 2*3*(P2-P1)*(1-t)*t + 3*(P3-P2)*t^2,由[3*(P1-P0), 3*(P2-P1), 3*(P3-P2)]三个点确定的Bezier2曲线
    // Bezier3'(t) = 3*(-P0+3*P1-3P2+P3)*t^2+6*(P0-2*P1+P2)*t+3*(P1-P0)
    // t=(-b(+-)√(b^2-4*a*c))/(2*a),a=3*(-P0+3*P1-3P2+P3),b=6*(P0-2*P1+P2),c=3*(P1-P0)
    extrema() {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];

        const a = (dim: 'x' | 'y') => {
            return 3 * (-p0[dim] + 3 * p1[dim] - 3 * p2[dim] + p3[dim])
        }
        const b = (dim: 'x' | 'y') => {
            return 6 * (p0[dim] - 2 * p1[dim] + p2[dim])
        }
        const c = (dim: 'x' | 'y') => {
            return 3 * (p1[dim] - p0[dim])
        }

        const ax = a('x');
        const bx = b('x');
        const cx = c('x');

        const ay = a('y');
        const by = b('y');
        const cy = c('y');

        const dx = bx * bx - 4 * ax * cx;
        const dy = by * by - 4 * ay * cy;

        const ret: number[] = [];

        if (ax === 0) {
            // 线性函数，没有极值
        }
        else if (dx === 0) {
            ret.push(-bx / (2 * ax))
        }
        else if (dx > 0) {
            const sqrt = Math.sqrt(dx);
            ret.push((-bx + sqrt) / (2 * ax), (-bx - sqrt) / (2 * ax))
        }

        if (ay === 0) {
            // 线性函数，没有极值
        }
        else if (dy === 0) {
            ret.push(-by / (2 * ay))
        }
        else if (dy > 0) {
            const sqrt = Math.sqrt(dy);
            ret.push((-by + sqrt) / (2 * ay), (-by - sqrt) / (2 * ay))
        }

        const accept = (t: number, i: number) => {
            return t >= 0 && t <= 1 && ret.indexOf(t) === i;
        }
        return ret.filter(accept).sort((a, b) => a - b)
    }
}