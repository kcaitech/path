import { Line } from "./line";
import { float_accuracy, Point, Rect, rect_contains_point, Segment } from "./basic"

const ZERO = { x: 0, y: 0 };

function solveQuadraticEquation(ax: number, bx: number, cx: number) {
    const dx = bx * bx - 4 * ax * cx;
    const retx: number[] = [];
    if (ax === 0) {
        if (bx !== 0) retx.push(cx / bx);
    }
    else if (dx === 0) {
        retx.push(-bx / (2 * ax))
    }
    else if (dx > 0) {
        const sqrt = Math.sqrt(dx);
        retx.push((-bx + sqrt) / (2 * ax), (-bx - sqrt) / (2 * ax))
    }
    return retx.sort((a, b) => a - b);
}

// Cardano's mathematical formula
// https://github.com/vtzast/Cubic_Equation_Solver/blob/main/Cubic%20Equation%20Solver.py
export function solveCubicEquation(a: number, b: number, c: number, d: number): number[] {
    if (a === 0) {
        return solveQuadraticEquation(b, c, d)
    }
    if (d === 0) {
        return [0, ...solveQuadraticEquation(a, b, c)].filter((v, i, arr) => {
            return arr.indexOf(v) === i
        }).sort((a, b) => a - b);
    }
    let roots: number[]
    const cube_root = (x: number) => 0 <= x ? x ** (1. / 3.) : (- ((-x) ** (1. / 3.)))
    const delta = 18 * a * b * c * d - 4 * (b ** 3) * d + (b ** 2) * (c ** 2) - 4 * a * (c ** 3) - 27 * (a ** 2) * (d ** 2)
    const P = b ** 2 - 3 * a * c
    const Q = 9 * a * b * c - 2 * (b ** 3) - 27 * (a ** 2) * d
    if (delta > 0) {
        const D1 = (2 * (b / a) ** 3 - 9 * ((b / a) * (c / a)) + 27 * (d / a)) / 54
        const D2 = ((b / a) ** 2 - 3 * (c / a)) / 9
        const theta = Math.acos(D1 / Math.sqrt(D2 ** 3))
        const x1 = -2 * Math.sqrt(D2) * Math.cos(theta / 3) - b / 3
        const x2 = -2 * Math.sqrt(D2) * Math.cos((theta + 2 * Math.PI) / 3) - b / 3
        const x3 = -2 * Math.sqrt(D2) * Math.cos((theta - 2 * Math.PI) / 3) - b / 3
        roots = [x1, x2, x3]
    } else if (delta < 0) {
        const N = cube_root(Q / 2 + Math.sqrt((Q ** 2) / 4 - P ** 3)) + cube_root(Q / 2 - Math.sqrt((Q ** 2) / 4 - P ** 3))
        const x = -b / (3 * a) + N / (3 * a)
        // 复数解
        // const z1 = complex(round((-B / (3 * A) - (N / 2) / (3 * A)), 2),
        //     round(sqrt((3 / 4) * N ** 2 - 3 * P) / (3 * A), 2))
        // const z2 = z1.conjugate()
        roots = [x]
    } else if (P == 0) {
        const x = -b / (3 * a)
        roots = [x]
    } else {
        const xd = (9 * a * d - b * c) / (2 * P)
        const xs = (4 * a * b * c - 9 * a ** 2 * d - b ** 3) / (a * P)
        roots = [xd, xs]
    }
    return roots.filter((v, i, arr) => {
        return arr.indexOf(v) === i
    }).sort((a, b) => a - b);
}

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
        let minx = Math.min(p0.x, p2.x);
        let miny = Math.min(p0.y, p2.y);
        let maxx = Math.max(p0.x, p2.x);
        let maxy = Math.max(p0.y, p2.y);
        extrema.map(this.pointAt.bind(this)).forEach(p => {
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

    abstract locate(p: Point): number[]  // 点在线上的位置



    intersect(seg: Segment): ({ type: "overlap", t0: number, t1: number, t3: number, t4: number } | { type: "intersect", t0: number, t1: number })[] { // 相交、不相交、重合
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

    locate(p: Point): number[] {
        // 判断bbox包含p
        if (!rect_contains_point(this.bbox(), p)) return [];

        // f(t) = P0*(1-t)^2 + 2*P1*(1-t)*t + P2*t^2 - p = 0, 求t
        // a=P0 -2*P1 + P2
        // b=-2*(P0-P1)
        // c=P0-p
        // f(t) = a*t^2 + b*t + c
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const a = (dim: 'x' | 'y') => {
            return p0[dim] - 2 * p1[dim] + p2[dim]
        }
        const b = (dim: 'x' | 'y') => {
            return -2 * (p0[dim] - p1[dim])
        }
        const c = (dim: 'x' | 'y') => {
            return p0[dim] - p[dim]
        }

        const fix = (t: number) => {
            if (Math.abs(t) < float_accuracy) t = 0;
            else if (Math.abs(t - 1) < float_accuracy) t = 1;
            return t;
        }

        const resolve = (dim: 'x' | 'y') => {
            const ax = a(dim);
            const bx = b(dim);
            const cx = c(dim);
            const retx = solveQuadraticEquation(ax, bx, cx);
            return retx.map(fix).filter((t) => t >= 0 && t <= 1);
        }

        const retx = resolve('x');
        if (retx.length === 0) return retx;

        const rety = resolve('y');
        if (rety.length === 0) return rety;

        const accept = (t: number, i: number) => {
            return rety.indexOf(t) === i && retx.find((v) => Math.abs(v - t) < float_accuracy) !== undefined;// 考虑误差
        }

        return rety.map(fix).filter(accept).sort((a, b) => a - b)
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

        const ret = [...solveQuadraticEquation(ax, bx, cx), ...solveQuadraticEquation(ay, by, cy)];

        const accept = (t: number, i: number) => {
            return t >= 0 && t <= 1 && ret.indexOf(t) === i;
        }
        return ret.filter(accept).sort((a, b) => a - b)
    }

    // 返回true，不会相交，false，有可能相交
    isNonIntersect(): boolean {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        // 判断终点是与控点p2是否在p0-p1直线的两边
        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
        const v2 = { x: p2.x - p0.x, y: p2.y - p0.y };
        const v3 = { x: p3.x - p0.x, y: p3.y - p0.y };
        const cross1 = v1.x * v2.y - v1.y * v2.x;
        const cross2 = v1.x * v3.y - v1.y * v3.x;
        return (cross1 * cross2 >= 0);
    }

    locate(p: Point): number[] {
        // 判断bbox包含p
        if (!rect_contains_point(this.bbox(), p)) return [];

        // f(t) = P0*(1-t)^3 + 3*P1*(1-t)^2*t + 3*P2*(1-t)*t^2 + P3*t^3 - p = 0, 求t

        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        const a3 = (dim: 'x' | 'y') => {
            return -p0[dim] + 3 * p1[dim] - 3 * p2[dim] + p3[dim]
        }
        const a2 = (dim: 'x' | 'y') => {
            return 3 * p0[dim] - 6 * p1[dim] + 3 * p2[dim]
        }
        const a1 = (dim: 'x' | 'y') => {
            return -3 * p0[dim] + 3 * p1[dim]
        }
        const a0 = (dim: 'x' | 'y') => {
            return p0[dim] - p[dim]
        }

        const fix = (t: number) => {
            if (Math.abs(t) < float_accuracy) t = 0;
            else if (Math.abs(t - 1) < float_accuracy) t = 1;
            return t;
        }

        const resolve_quard = (dim: 'x' | 'y') => {
            const ax = a2(dim);
            const bx = a1(dim);
            const cx = a0(dim);
            const retx = solveQuadraticEquation(ax, bx, cx);
            return retx.map(fix).filter((t) => t >= 0 && t <= 1);
        }

        const resolve_ret = (retx: number[], dim: 'x' | 'y') => {
            return retx.filter((t, i) => {
                if (retx.indexOf(t) !== i) return false;
                const _p = this.pointAt(t);
                return Math.abs(_p[dim] - p[dim]) < float_accuracy;
            }).sort((a, b) => a - b)
        }

        // 二次方程求解
        if ((a3('x')) === 0) {
            const retx = resolve_quard('x');
            return resolve_ret(retx, 'y');
        } else if ((a3('y')) === 0) {
            const rety = resolve_quard('y');
            return resolve_ret(rety, 'x');
        }

        const retx = solveCubicEquation(a3('x'), a2('x'), a1('x'), a0('x')).map(fix).filter((t) => t >= 0 && t <= 1);
        return resolve_ret(retx, 'y');
    }
}