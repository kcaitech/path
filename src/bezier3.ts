import { Line } from "./line";
import { float_accuracy, Point, Rect, rect_contains_point, Segment } from "./basic"

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
        // b=-2*(P0+P1)
        // c=P0-p
        // f(t) = a*t^2 + b*t + c
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const a = (dim: 'x' | 'y') => {
            return p0[dim] - 2 * p1[dim] + p2[dim]
        }
        const b = (dim: 'x' | 'y') => {
            return -2 * (p0[dim] + p1[dim])
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

            return retx.map(fix).filter((t) => t >= 0 && t <= 1);
        }

        const retx = resolve('x');
        if (retx.length === 0) return retx;

        const rety = resolve('y');
        if (rety.length === 0) return rety;

        console.log(retx, rety)
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

        const dx = bx * bx - 4 * ax * cx;
        const dy = by * by - 4 * ay * cy;

        const ret: number[] = [];

        if (ax === 0) {
            if (bx !== 0) ret.push(cx / bx);
        }
        else if (dx === 0) {
            ret.push(-bx / (2 * ax))
        }
        else if (dx > 0) {
            const sqrt = Math.sqrt(dx);
            ret.push((-bx + sqrt) / (2 * ax), (-bx - sqrt) / (2 * ax))
        }

        if (ay === 0) {
            if (by !== 0) ret.push(cy / by);
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

        //  Bairstow’s method & Newton's method
        // https://en.wikipedia.org/wiki/Bairstow%27s_method
        // https://en.wikipedia.org/wiki/Newton%27s_method
        // a3 = -P0+3*P1-3*P2+P3
        // a2 = 3*P0 - 6*P1 + 3*P2
        // a1 = -3*P0 + 3*P1
        // a0 = P0 - p
        // f(t) = a3*t^3 + a2*t^2 + a1*t + a0
        // f'(t) = 3*a3*t^2 + 2*a2*t + a1
        // 令t=0及t=1开始用Newton's method计算？// 如果是自相交的bezier曲线，可能有两个解

        // 使用牛顿方法求解，方便快速排除无0-1的解的情况
        // Newton's method: t(n+1) = t(n) - f(tn) / f'(tn)
        // 计算出t(n)如果不在0-1时，判断[-B(tn) / B'(tn)]的方向，如果继续远离，则直接结束(都不用判断,不行,迭代过程中t有可能超出0-1区间)
        // 可能自相交的t=0及t=1开始，不自相交的从t=0.5开始

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
        const df = (t: number, a3: number, a2: number, a1: number) => {
            return 3 * a3 * t ** 2 + 2 * a2 * t + a1
        }
        const f = (t: number, a3: number, a2: number, a1: number, a0: number) => {
            return a3 * t ** 3 + a2 * t ** 2 + a1 * t + a0
        }

        const newton = (t: number, a3: number, a2: number, a1: number, a0: number) => {
            let pt = Number.MAX_SAFE_INTEGER;
            let maxloop = 100; // 防止无限循环？
            while (Math.abs(pt - t) > float_accuracy && (--maxloop > 0)) {
                pt = t;
                const d = df(t, a3, a2, a1);
                if (d === 0) {
                    return Number.MAX_SAFE_INTEGER
                }
                const s = -f(t, a3, a2, a1, a0) / d;
                if (t >= 1 && s > 0 || t <= 0 && s < 0) return Number.MAX_SAFE_INTEGER
                t += s;
            }
            if (maxloop === 0) {
                console.error("newton loop")
                return Number.MAX_SAFE_INTEGER
            }
            // console.log('newton loop', 100 - maxloop)
            // 修正下t
            if (Math.abs(t) < float_accuracy) t = 0;
            else if (Math.abs(t - 1) < float_accuracy) t = 1;

            return t;
        }

        const nonIntersect = this.isNonIntersect();

        const resolve = (dim: 'x' | 'y') => {
            const a3x = a3(dim);
            const a2x = a2(dim);
            const a1x = a1(dim);
            const a0x = a0(dim);
            const retx: number[] = [];
            if (nonIntersect) {
                const t = newton(0.5, a3x, a2x, a1x, a0x);
                if (t >= 0 && t <= 1) retx.push(t);
            } else {
                const t = newton(0, a3x, a2x, a1x, a0x);
                if (t >= 0 && t <= 1) retx.push(t);
                const t1 = newton(1, a3x, a2x, a1x, a0x);
                if (t1 >= 0 && t1 <= 1) retx.push(t1);
            }
            return retx;
        }

        // 先计算x
        const retx = resolve('x');
        if (retx.length === 0) return retx;

        // 计算y
        const rety = resolve('y');
        if (rety.length === 0) return rety;

        const accept = (t: number, i: number) => {
            return t >= 0 && t <= 1 && rety.indexOf(t) === i && retx.find((v) => Math.abs(v - t) < float_accuracy) !== undefined;// 考虑误差
        }
        return rety.filter(accept).sort((a, b) => a - b)

        // f(t) = (t^2 + u*t + v) *(b1*t + b0) + (ct + d) = 0,误差(ct + d)代表？
        // b1= a3
        // b0 = a2 - u*a3
        // c = a1 -u*b0 -v*b1= a1 - u*a2 + u^2*a3 -v*a3
        // d = a0-v*b0 = a0 - v*a2 + v*u*a3
        // 求c=d=0时uv的值
        // Newton's method: x(n+1) = x(n) - f(xn) / f'(xn)
        // c'u = -a2 + 2*a3*u
        // c'v = -a3
        // d'u = v*a3
        // d'v = u*a3 - a2
        // Jacobi矩阵: A
        //          c'u c'v
        //          d'u d'v
        // |A| = c'u * d'v - c'v * d'u
        // 如果|A|!==0, A可逆
        // A^-1 = 1/|A| * |d'v  -c'v|
        //                |-d'u  c'u|
        // |u|=|u|-A^-1 * |c|
        // |v| |v|        |d|
        // 如果|A|===0,无解？


        // throw new Error("Method not implemented.");
    }
}