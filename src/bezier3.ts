/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { Line } from "./line";
import { alignX, float_accuracy, float_eq, intersect_rect, isLine, PathCmd, Point, points_eq, Rect, rect_contains_point, Segment, solveCubicEquation, solveQuadraticEquation, splits } from "./basic"
import { binarySearch } from "./binarysearch";

const ZERO = { x: 0, y: 0 };

const fix01 = function (t: number) {
    if (Math.abs(t) < float_accuracy) t = 0;
    else if (Math.abs(t - 1) < float_accuracy) t = 1;
    return t;
}

const filt01 = function (t: number) { return t >= 0 && t <= 1 }


interface DiscreteNode {
    t0: number
    t1: number
    curve: Bezier
    parent?: DiscreteNode
    childs?: DiscreteNode[]
}

abstract class Bezier implements Segment {
    points: Point[]


    abstract get type(): "Q" | "C";
    get from() {
        return this.points[0];
    }
    get to() {
        return this.points[this.points.length - 1];
    }

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

    abstract intersect(seg: Segment): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] // 相交、不相交、重合

    // 预先split的curve,用于intersect判断 // 
    _discrete?: DiscreteNode[]
    discreate(): DiscreteNode[] {
        if (this._discrete) return this._discrete;

        const nodes: DiscreteNode[] = []

        const extrema = this.extrema().filter(t => !float_eq(t, 0) && !float_eq(t, 1));
        if (extrema.length > 0) {
            const curves = splits(this, extrema);
            curves.forEach(c => c._extrema = []); // 不再需要计算极值
            extrema.push(1);
            if (extrema.length !== curves.length) throw new Error();
            let pt = 0
            for (let i = 0, len = extrema.length; i < len; ++i) {
                const t1 = extrema[i]
                nodes.push({
                    t0: pt,
                    t1,
                    curve: curves[i]
                })
                pt = t1
            }
        } else {
            nodes.push({
                t0: 0,
                t1: 1,
                curve: this
            })
        }

        // split sub curve
        // 二分，直到点的距离小于1或者达到一4层级，最多分成32份（不算有extrema的情况）
        const split = (nodes: DiscreteNode[], level: number) => {
            for (let i = 0, len = nodes.length; i < len; ++i) {
                const n = nodes[i];
                const c = n.curve;

                const bbox = c.bbox();
                if (bbox.w < 1 && bbox.h < 1) continue;

                const sp = c.split(0.5);
                n.childs = []
                n.childs.push({ t0: 0, t1: 0.5, curve: sp[0], parent: n })
                n.childs.push({ t0: 0.5, t1: 1, curve: sp[1], parent: n })
                if (level < 4) split(n.childs, level + 1);
            }
        }

        split(nodes, 0)

        if (extrema.length > 0) {
            this._discrete = nodes;
        } else {
            this._discrete = nodes[0].childs || nodes; // 至少要有一个
            this._discrete.forEach(n => n.parent = undefined)
        }

        return this._discrete;
    }

    intersect2(rect: Rect): boolean {
        const discreate = this.discreate().slice(0);

        while (discreate.length > 0) {
            const d = discreate.pop()!;
            if (intersect_rect(rect, d.curve.bbox())) {
                if (d.childs) {
                    discreate.push(...d.childs)
                } else {
                    return true;
                }
            }
        }
        return false;
    }

    abstract toBezier3(): Point[];

    coincident(_seg: Segment): { type: "coincident"; t0: number; t1: number; t2: number; t3: number; } | undefined {
        if (!intersect_rect(this.bbox(), _seg.bbox())) return;
        if (this.isLine) return new Line(this.points[0], this.points[this.points.length - 1]).coincident(_seg);
        if (_seg.type === 'L') return;

        const seg = _seg as Bezier;
        if (seg.points.length < this.points.length) {
            const c = searchCoincident(seg, this); // bezier2在前效率好点
            if (c) {
                return { type: "coincident", t0: c.t2, t1: c.t3, t2: c.t0, t3: c.t1 }
            }
            return;
        }
        const coincident = searchCoincident(this, seg) as { type: "coincident"; t0: number; t1: number; t2: number; t3: number; } | undefined;
        if (coincident) coincident.type = 'coincident';
        return coincident
    }

    _intersectBezier(curve: Bezier, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {

        if (!noCoincident) {
            const coincident = this.coincident(curve);
            if (coincident) return [coincident];
        }

        const pending: { c1: DiscreteNode, c2: DiscreteNode }[] = []
        const findPending0 = (d0: DiscreteNode, discreate1: DiscreteNode[]) => {
            for (let i = 0, len = discreate1.length; i < len; ++i) {
                const d1 = discreate1[i];
                if (intersect_rect(d0.curve.bbox(), d1.curve.bbox())) {
                    if (d1.childs) {
                        findPending0(d0, d1.childs)
                    } else {
                        pending.push({ c1: d0, c2: d1 })
                    }
                }
            }
        }
        const findPending1 = (discreate0: DiscreteNode[], d1: DiscreteNode) => {
            for (let i = 0, len = discreate0.length; i < len; ++i) {
                const d0 = discreate0[i];
                if (intersect_rect(d0.curve.bbox(), d1.curve.bbox())) {
                    if (d0.childs) {
                        findPending1(d0.childs, d1)
                    } else {
                        pending.push({ c1: d0, c2: d1 })
                    }
                }
            }
        }
        const findPending = (discreate0: DiscreteNode[], discreate1: DiscreteNode[]) => {
            for (let i = 0, len = discreate0.length; i < len; ++i) {
                const d0 = discreate0[i];
                for (let j = 0, len = discreate1.length; j < len; ++j) {
                    const d1 = discreate1[j];
                    if (intersect_rect(d0.curve.bbox(), d1.curve.bbox())) {
                        if (d0.childs) {
                            if (d1.childs) {
                                findPending(d0.childs, d1.childs)
                            }
                            else {
                                findPending1(d0.childs, d1)
                            }
                        } else {
                            if (d1.childs) {
                                findPending0(d0, d1.childs)
                            }
                            else {
                                pending.push({ c1: d0, c2: d1 })
                            }
                        }
                    }
                }
            }
        }

        findPending(this.discreate(), curve.discreate());

        const fixt = (t: number, n: DiscreteNode | undefined) => {
            while (n) {
                const { t0, t1 } = n;
                const d = t1 - t0;
                if (d < 0) throw new Error()
                t = t0 + t * d;
                n = n.parent;
            }
            return t;
        }

        const intersect = pending.reduce((p, v) => {
            const intersect = binarySearch(v.c1.curve, v.c2.curve) as { type: "intersect", t0: number, t1: number }[];
            if (intersect.length > 0) {
                p.push(...intersect.map((i) => {
                    i.t0 = fixt(i.t0, v.c1)
                    i.t1 = fixt(i.t1, v.c2)
                    return i;
                }))
            }
            return p;
        }, [] as { type: "intersect", t0: number, t1: number }[])

        if (intersect.length > 0) {
            intersect.forEach(c => c.type = 'intersect')
            return intersect;
        }

        return [];
    }

    abstract reverse(): Bezier;

    abstract toCmd(): PathCmd;

    abstract clone(): Bezier;
}

function searchCoincident(curve1: Bezier, curve2: Bezier): { t0: number, t1: number, t2: number, t3: number } | undefined {
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return;

    const findPossible = () => {
        const c2fromOnC1 = curve1.locate(curve2.from);
        const c2toOnC1 = curve1.locate(curve2.to);

        if (c2fromOnC1.length === 0 && c2toOnC1.length === 0) return []

        const possible: { t0: number, t1: number, t2: number, t3: number }[] = []

        if (c2fromOnC1.length > 0 && c2toOnC1.length > 0) {
            c2fromOnC1.forEach(c2fromOnC1_t => {
                c2toOnC1.forEach(c2toOnC1_t => {
                    possible.push({ t0: c2fromOnC1_t, t1: c2toOnC1_t, t2: 0, t3: 1 })
                })
            })
            return possible;
        }

        const c1fromOnC2 = curve2.locate(curve1.from)
        const c1toOnC2 = curve2.locate(curve1.to)

        if (c1fromOnC2.length === 0 && c1toOnC2.length === 0) return []

        if (c1fromOnC2.length > 0 && c1toOnC2.length > 0) {
            c1fromOnC2.forEach(c1fromOnC2_t => {
                c1toOnC2.forEach(c1toOnC2_t => {
                    possible.push({ t0: 0, t1: 1, t2: c1fromOnC2_t, t3: c1toOnC2_t })
                })
            })
            return possible;
        }

        // let t0, t1, t2, t3

        const t0 = c1fromOnC2.length > 0 ? [0] : (c2fromOnC1.length > 0 ? c2fromOnC1 : c2toOnC1)
        const t1 = c1fromOnC2.length > 0 ? (c2fromOnC1.length > 0 ? c2fromOnC1 : c2toOnC1) : [1]

        const t2 = c2fromOnC1.length > 0 ? [0] : (c1fromOnC2.length > 0 ? c1fromOnC2 : c1toOnC2)
        const t3 = c2fromOnC1.length > 0 ? (c1fromOnC2.length > 0 ? c1fromOnC2 : c1toOnC2) : [1];

        t0.forEach(_t0 => {
            t1.forEach(_t1 => {
                t2.forEach(_t2 => {
                    t3.forEach(_t3 => {
                        possible.push({ t0: _t0, t1: _t1, t2: _t2, t3: _t3 })
                    })
                })
            })
        })
        return possible;
    }

    const possible = findPossible();
    if (possible.length === 0) return;

    possible.sort((a, b) => Math.abs(b.t0 - b.t1) - Math.abs(a.t0 - a.t1))

    const split = (t0: number, t1: number, curve: Bezier): Bezier => {
        const _t0 = Math.min(t0, t1);
        const c1 = curve.split(_t0);
        const c11 = c1[c1.length - 1].split(Math.abs(t0 - t1) / (1 - _t0));
        const c111 = c11[c11.length - 1]
        return c111;
    }

    const eq = (c1: Bezier, c2: Bezier): boolean => {
        const p1 = c1.toBezier3();
        const p2 = c2.toBezier3();
        return points_eq(p1, p2) || points_eq(p1.reverse(), p2);
    }

    for (let i = 0, len = possible.length; i < len; ++i) {
        const { t0, t1, t2, t3 } = possible[i];
        const c1 = split(t0, t1, curve1);
        const c2 = split(t2, t3, curve2);
        if (eq(c1, c2)) return { t0, t1, t2, t3 }
    }
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
    // t = (P0-P1)/(P2-2*P1+P0)时取得极值
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
            return (p0[dim] - p1[dim]) / d;
        }
        if (dx !== 0) ret.push(t('x', dx));
        if (dy !== 0) ret.push(t('y', dy));

        const accept = (t: number, i: number) => {
            return !float_eq(t, 0) && !float_eq(t, 1) && t > 0 && t < 1 && ret.indexOf(t) === i;
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

        const extrema = this.extrema().length > 0 ? undefined : [];

        return [
            new Bezier2(p0, p01, p012, extrema),
            new Bezier2(p012, p12, p2, extrema)
        ];
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
        if (!intersect_rect(this.bbox(), seg.bbox())) return [];
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

    reverse(): Bezier2 {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        return new Bezier2(p2, p1, p0, this._extrema?.length === 0 ? [] : undefined)
    }

    toCmd(): PathCmd {
        const p1 = this.points[1];
        const p2 = this.points[2];
        return { type: 'Q', x: p2.x, y: p2.y, x1: p1.x, y1: p1.y }
    }

    clone(): Bezier2 {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        return new Bezier2(p0, p1, p2, this._extrema?.length === 0 ? [] : undefined)
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
            return !float_eq(t, 0) && !float_eq(t, 1) && t > 0 && t < 1 && ret.indexOf(t) === i;
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

        const extrema = this.extrema().length > 0 ? undefined : [];


        return [
            new Bezier3(p0, p01, p012, p0123, extrema),
            new Bezier3(p0123, p123, p23, p3, extrema)
        ];
    }

    intersect(seg: Segment, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] {
        if (!intersect_rect(this.bbox(), seg.bbox())) return [];
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

    reverse(): Bezier3 {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        return new Bezier3(p3, p2, p1, p0, this._extrema?.length === 0 ? [] : undefined)
    }

    toCmd(): PathCmd {
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        return { type: 'C', x: p3.x, y: p3.y, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }

    clone(): Bezier3 {
        const p0 = this.points[0];
        const p1 = this.points[1];
        const p2 = this.points[2];
        const p3 = this.points[3];
        return new Bezier3(p0, p1, p2, p3, this._extrema?.length === 0 ? [] : undefined)
    }
}