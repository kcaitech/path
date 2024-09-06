import { Line } from "./line";
import { alignX, float_accuracy, float_eq, intersect_rect, isLine, Point, Rect, rect_contains_point, Segment, solveCubicEquation, solveQuadraticEquation } from "./basic"

const ZERO = { x: 0, y: 0 };

const fix01 = function (t: number) {
    if (Math.abs(t) < float_accuracy) t = 0;
    else if (Math.abs(t - 1) < float_accuracy) t = 1;
    return t;
}

const filt01 = function (t: number) { return t >= 0 && t <= 1 }

abstract class Bezier implements Segment {
    points: Point[]

    // todo
    // discrete?: Line[]
    // d: number = 1 / 20; // 默认分割20份
    // color?: number
    // origin?: {
    //     segment: Segment,
    //     t0: number,
    //     t1: number
    // }

    abstract get type(): "Q" | "C";

    constructor(p0: Point, p1: Point, p2: Point, extrema?: number[])
    constructor(p0: Point, p1: Point, p2: Point, p3: Point, extrema?: number[])
    constructor(p0: Point, p1: Point, p2: Point, p3?: Point | number[], extrema?: number[]) {
        if (p3 && !Array.isArray(p3)) {
            this.points = [p0, p1, p2, p3]
        } else {
            this.points = [p0, p1, p2]
        }
        if (Array.isArray(p3)) {
            this._extrema = p3;
        } else if (Array.isArray(extrema)) {
            this._extrema = extrema;
        }
    }


    _isLine?: boolean
    get isLine() {
        if (this._isLine === undefined) this._isLine = isLine(this.points)
        return this._isLine;
    }

    _extrema?: number[]
    abstract extrema(): number[];

    _bbox?: Rect & { x2: number, y2: number }
    bbox(): Rect & { x2: number, y2: number } {
        if (this._bbox) return this._bbox;
        const p0 = this.points[0];
        const p2 = this.points[this.points.length - 1];
        let minx = Math.min(p0.x, p2.x);
        let miny = Math.min(p0.y, p2.y);
        let maxx = Math.max(p0.x, p2.x);
        let maxy = Math.max(p0.y, p2.y);
        const extrema = this.extrema();
        if (extrema.length > 0) extrema.map(this.pointAt.bind(this)).forEach(p => {
            minx = Math.min(minx, p.x);
            maxx = Math.max(maxx, p.x);
            miny = Math.min(miny, p.y);
            maxy = Math.max(maxy, p.y);
        })
        this._bbox = { x: minx, y: miny, w: maxx - minx, h: maxy - miny, x2: maxx, y2: maxy }
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

    abstract split(t: number): Bezier[];

    abstract splits(ts: number[]): Bezier[];

    abstract intersect(seg: Segment): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] // 相交、不相交、重合

    abstract clip(rect: Rect): { seg: Bezier, t0: number, t1: number }[];

    abstract toBezier3(): Point[];

    coincident(_seg: Segment): { type: "coincident"; t0: number; t1: number; t2: number; t3: number; }[] {

        if (this.isLine) return new Line(this.points[0], this.points[this.points.length - 1]).coincident(_seg);
        if (_seg.type === 'L') return [];

        const seg = _seg as Bezier;
        if (seg.points.length < this.points.length) {
            const coincident = searchCoincident(seg, this); // bezier2在前效率好点
            return coincident.map(c => {
                const _c = { type: "coincident", t0: c.t2, t1: c.t3, t2: c.t0, t3: c.t1 } as { type: "coincident", t0: number, t1: number, t2: number, t3: number }
                return _c;
            })
        }
        const coincident = searchCoincident(this, seg);
        return coincident.map(c => {
            const _c = c as { type: "coincident", t0: number, t1: number, t2: number, t3: number }
            _c.type = 'coincident'
            return _c;
        })
    }

    _intersectBezier(curve: Bezier, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {

        if (!noCoincident) {
            const coincident = this.coincident(curve);
            if (coincident.length > 0) return coincident;
        }

        // todo 考虑提前split好一些curve，方便复用
        const intersect = binarySearch(this, curve);
        if (intersect.length > 0) {
            return intersect.map(c => {
                const _c = c as { type: "intersect", t0: number, t1: number }
                _c.type = 'intersect'
                return _c;
            })
        }

        return [];
    }
}

function _binarySearch(curve1: Bezier, curve2: Bezier): { t0: number, t1: number }[] {

    // 能否再快点？

    const box1 = curve1.bbox();
    const box2 = curve2.bbox();
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return []

    const box1ispoint = box1.w < float_accuracy && box1.h < float_accuracy;
    const box2ispoint = box2.w < float_accuracy && box2.h < float_accuracy
    if (box1ispoint && box2ispoint) {
        return [{ t0: 0.5, t1: 0.5 }]
    }

    let c1: Bezier[]
    let t1: number[]
    let c2: Bezier[]
    let t2: number[]
    if (box1ispoint) {
        c1 = [curve1]
        t1 = [0, 1]
    } else {
        c1 = curve1.split(0.5)
        t1 = [0, 0.5, 1]
    }
    if (box2ispoint) {
        c2 = [curve2]
        t2 = [0, 1]
    } else {
        c2 = curve2.split(0.5)
        t2 = [0, 0.5, 1]
    }

    const ret: { t0: number, t1: number }[] = []
    for (let i = 0, len = c1.length; i < len; ++i) {
        const v1 = c1[i];
        for (let j = 0, len = c2.length; j < len; ++j) {
            const v2 = c2[j];
            const ret1 = _binarySearch(v1, v2);
            if (ret1.length === 0) continue;

            const t11 = t1[i]
            const t12 = t1[i + 1]
            const d1 = t12 - t11
            const t21 = t2[j]
            const t22 = t2[j + 1]
            const d2 = t22 - t21

            ret1.forEach(r => {
                ret.push({ t0: t11 + r.t0 * d1, t1: t21 + r.t1 * d2 })
            })
        }
    }

    return ret;
}

function binarySearch(curve1: Bezier, curve2: Bezier): { t0: number, t1: number }[] {
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return []

    const extrema1 = curve1.extrema().filter(t => !float_eq(t, 0) && !float_eq(t, 1));
    const extrema2 = curve2.extrema().filter(t => !float_eq(t, 0) && !float_eq(t, 1));

    if (extrema1.length === 0 && extrema2.length === 0) return _binarySearch(curve1, curve2);

    let c1: Bezier[]
    let t1: number[]
    let c2: Bezier[]
    let t2: number[]

    if (extrema1.length > 0) {
        c1 = curve1.splits(extrema1)
        t1 = [0, ...extrema1, 1]
    } else {
        c1 = [curve1]
        t1 = [0, 1]
    }
    if (extrema2.length > 0) {
        c2 = curve2.splits(extrema2)
        t2 = [0, ...extrema2, 1]
    } else {
        c2 = [curve2]
        t2 = [0, 1]
    }

    const ret: { t0: number, t1: number }[] = []
    for (let i = 0, len = c1.length; i < len; ++i) {
        const v1 = c1[i];
        for (let j = 0, len = c2.length; j < len; ++j) {
            const v2 = c2[j];
            const ret1 = _binarySearch(v1, v2);
            if (ret1.length === 0) continue;

            const t11 = t1[i]
            const t12 = t1[i + 1]
            const d1 = t12 - t11
            const t21 = t2[j]
            const t22 = t2[j + 1]
            const d2 = t22 - t21

            ret1.forEach(r => {
                ret.push({ t0: t11 + r.t0 * d1, t1: t21 + r.t1 * d2 })
            })
        }
    }
    return ret;
}


function point_eq(p1: Point, p2: Point) {
    return float_eq(p1.x, p2.x) && float_eq(p1.y, p2.y)
}

function points_eq(points1: Point[], points2: Point[]) {
    if (points1.length !== points2.length) return false;
    for (let i = 0, len = points1.length; i < len; ++i) {
        if (!point_eq(points1[i], points2[i])) return false;
    }
    return true;
}

function searchCoincident(curve1: Bezier, curve2: Bezier): { t0: number, t1: number, t2: number, t3: number }[] {
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return []

    const points1 = curve1.points;
    const points2 = curve2.points;

    // if (points2.length < points1.length) {
    //     // todo 二次曲线locate效率更高
    // }

    const l1_20 = curve1.locate(points2[0]);
    const l1_21 = curve1.locate(points2[points2.length - 1]);

    if (l1_20.length === 0 && l1_21.length === 0) return []

    // todo
    if (l1_20.length > 0 && l1_21.length > 0) {

    }
    throw new Error();
}


export class Bezier2 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point, extrema?: number[]) {
        super(p0, p1, p2, extrema)
    }

    get type(): "Q" {
        return "Q"
    }

    // _extrema?: number[]
    // Bzier2(t) = P0*(1-t)^2 + 2*P1*(1-t)*t + P2*t^2
    // Bzier2'(t) = 2*(1-t)*(P1-P0) + 2*t*(P2-P1) = 2*t*(P2-2*P1+P0)+2*(P1-P0) 直线方程.
    // t = (P1-P0)/(P2-2*P1+P0)时取得极值
    extrema() {
        if (this._extrema) return this._extrema;
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
        this._extrema = ret.filter(accept).sort((a, b) => a - b)
        return this._extrema;
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

        const resolve = (dim: 'x' | 'y') => {
            const ax = a(dim);
            const bx = b(dim);
            const cx = c(dim);
            const retx = solveQuadraticEquation(ax, bx, cx);
            return retx.map(fix01).filter(filt01);
        }

        const retx = resolve('x');
        if (retx.length === 0) return retx;

        const rety = resolve('y');
        if (rety.length === 0) return rety;

        const accept = (t: number, i: number) => {
            return rety.indexOf(t) === i && retx.find((v) => Math.abs(v - t) < float_accuracy) !== undefined;// 考虑误差
        }

        return rety.map(fix01).filter(accept).sort((a, b) => a - b)
    }

    split(t: number): Bezier2[] {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        if (t === 0 || t === 1) {
            return [new Bezier2(p0, p1, p2)]
        }

        function pa(p1: Point, p2: Point, t: number) {
            return {
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t
            }
        }
        const p01 = pa(p0, p1, t);
        const p12 = pa(p1, p2, t);
        const p012 = pa(p01, p12, t);
        return [
            new Bezier2(p0, p01, p012),
            new Bezier2(p012, p12, p2)
        ];
    }

    splits(t: number[]): Bezier2[] {
        if (t.length > 0) {

        }
        throw new Error()
    }

    clip(rect: Rect): { seg: Bezier2, t0: number, t1: number }[] {
        throw new Error()
    }

    toBezier3() {
        // If we have a curve with three points, then we can create a curve with four points that exactly reproduces the original curve. 
        // First, we give it the same start and end points, and for its two control points we pick "1/3rd start + 2/3rd control" and "2/3rd control + 1/3rd end". 
        // Now we have exactly the same curve as before, except represented as a cubic curve rather than a quadratic curve.
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = { x: p0.x / 3 + 2 * p1.x / 3, y: p0.y / 3 + 2 * p1.y / 3 }
        const p4 = { x: p2.x / 3 + 2 * p1.x / 3, y: p2.y / 3 + 2 * p1.y / 3 }
        return [p0, p3, p4, p2]
    }

    intersect(seg: Segment, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {

        if (seg.type === 'L') {
            return this._intersectLine(seg as Line);
        }
        return this._intersectBezier(seg as Bezier, noCoincident);
    }
    _intersectLine(line: Line): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {
        // 判定当前curve是否是直线
        // 变换到以直接以L为x轴或者y轴的空间，解方程。同locate
        if (this._isLine) {
            // 计算最大最小值 // 应该不用，这里是计算封闭区间，计算stroke时要处理？
            // const extrema = this.extrema();
            return new Line(this.points[0], this.points[this.points.length - 1]).intersect(line);
        }

        const alignpoints = alignX(this.points, line);
        const p0 = alignpoints[0];
        const p1 = alignpoints[1];
        const p2 = alignpoints[2];
        const a = p0 - 2 * p1 + p2
        const b = -2 * (p0 - p1)
        const c = p0

        const retx = solveQuadraticEquation(a, b, c).map(fix01).filter(filt01);
        return retx.reduce((r, t) => {
            const p = this.pointAt(t);
            const l = line.locate(p);
            if (l.length > 0) {
                r.push({ type: "intersect", t0: t, t1: l[0] })
            }
            return r;
        }, [] as { type: "intersect"; t0: number; t1: number; }[])
    }
}

export class Bezier3 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point, p3: Point, extrema?: number[]) {
        super(p0, p1, p2, p3, extrema)
    }

    // 需要转换为线段进行相交、等计算

    get type(): "C" {
        return "C"
    }

    // _extrema?: number[]

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

        if (this._extrema) return this._extrema;

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
        this._extrema = ret.filter(accept).sort((a, b) => a - b)
        return this._extrema;
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

        const resolve_quard = (dim: 'x' | 'y') => {
            const ax = a2(dim);
            const bx = a1(dim);
            const cx = a0(dim);
            const retx = solveQuadraticEquation(ax, bx, cx);
            return retx.map(fix01).filter(filt01);
        }

        const resolve_ret = (retx: number[], dim: 'x' | 'y') => {
            return retx.filter((t, i) => {
                if (retx.indexOf(t) !== i) return false;
                const _p = this.pointAt(t);
                return Math.abs(_p[dim] - p[dim]) < float_accuracy;
            }).sort((a, b) => a - b)
        }

        // y二次方程求解
        if ((a3('y')) === 0) {
            const rety = resolve_quard('y');
            return resolve_ret(rety, 'x');
        }

        const retx = solveCubicEquation(a3('x'), a2('x'), a1('x'), a0('x')).map(fix01).filter(filt01);
        return resolve_ret(retx, 'y');
    }

    split(t: number): Bezier3[] {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        if (t === 0 || t === 1) {
            return [new Bezier3(p0, p1, p2, p3)]
        }

        function pa(p1: Point, p2: Point, t: number) {
            return {
                x: p1.x + (p2.x - p1.x) * t,
                y: p1.y + (p2.y - p1.y) * t
            }
        }
        const p01 = pa(p0, p1, t);
        const p12 = pa(p1, p2, t);
        const p23 = pa(p2, p3, t);
        const p012 = pa(p01, p12, t);
        const p123 = pa(p12, p23, t);
        const p0123 = pa(p012, p123, t);
        return [
            new Bezier3(p0, p01, p012, p0123),
            new Bezier3(p0123, p123, p23, p3)
        ];
    }

    splits(ts: number[]): Bezier[] {
        throw new Error();
    }

    clip(rect: Rect): { seg: Bezier3, t0: number, t1: number }[] {
        throw new Error()
    }

    intersect(seg: Segment, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {
        if (seg.type === 'L') {
            return this._intersectLine(seg as Line);
        }
        return this._intersectBezier(seg as Bezier3, noCoincident);
    }

    _intersectLine(line: Line): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {
        // 判定当前curve是否是直线
        if (this._isLine) {
            // 计算最大最小值 // 应该不用，这里是计算封闭区间，计算stroke时要处理？
            // const extrema = this.extrema();
            return new Line(this.points[0], this.points[this.points.length - 1]).intersect(line);
        }
        const alignpoints = alignX(this.points, line);
        const p0 = alignpoints[0];
        const p1 = alignpoints[1];
        const p2 = alignpoints[2];
        const p3 = alignpoints[3];
        const a3 = -p0 + 3 * p1 - 3 * p2 + p3
        const a2 = 3 * p0 - 6 * p1 + 3 * p2
        const a1 = -3 * p0 + 3 * p1
        const a0 = p0

        const retx = solveCubicEquation(a3, a2, a1, a0).map(fix01).filter(filt01);
        // 判断这个t所在的点，在line上

        return retx.reduce((r, t) => {
            const p = this.pointAt(t);
            const l = line.locate(p);
            if (l.length > 0) {
                r.push({ type: "intersect", t0: t, t1: l[0] })
            }
            return r;
        }, [] as { type: "intersect"; t0: number; t1: number; }[])
    }

    toBezier3(): Point[] {
        return this.points
    }
}