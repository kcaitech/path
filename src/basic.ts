export const float_accuracy = 1e-7;
export const float_accuracy6 = 1e-6;

export function float_eq(a: number, b: number) {
    return Math.abs(a - b) < float_accuracy;
}

export function float_eq6(a: number, b: number) {
    return Math.abs(a - b) < float_accuracy6;
}

export type Point = {
    x: number;
    y: number;
}

export function point_eq(a: Point, b: Point) {
    return float_eq(a.x, b.x) && float_eq(a.y, b.y)
}

export function point_eq6(a: Point, b: Point) {
    return float_eq6(a.x, b.x) && float_eq6(a.y, b.y)
}

export function points_eq(points1: Point[], points2: Point[]) {
    if (points1.length !== points2.length) return false;
    for (let i = 0, len = points1.length; i < len; ++i) {
        if (!point_eq(points1[i], points2[i])) return false;
    }
    return true;
}

export type Line = {
    p1: Point,
    p2: Point
}

export type Rect = {
    w: number
    h: number
} & Point

export enum OpType { Difference, Union, Intersection, Xor }

export function intersect_range(lx0: number, lx1: number, rx0: number, rx1: number): boolean {
    return lx0 === lx1 ? rx0 <= lx0 && lx0 <= rx1 : (rx0 === rx1 ? lx0 <= rx0 && rx0 <= lx1 : lx0 <= rx1 && lx1 >= rx0);
}

export function contains_range(lx0: number, lx1: number, rx0: number, rx1: number): boolean {
    return lx0 <= rx0 && lx1 >= rx1;
}

export function contains_point(lx0: number, lx1: number, rx0: number): boolean {
    return lx0 <= rx0 && lx1 >= rx0;
}

export function intersect_rect(lhs: Rect, rhs: Rect): boolean {
    return intersect_range(lhs.x, lhs.x + lhs.w, rhs.x, rhs.x + rhs.w) &&
        intersect_range(lhs.y, lhs.y + lhs.h, rhs.y, rhs.y + rhs.h);
}

export function contains_rect(lhs: Rect, rhs: Rect): boolean {
    return contains_range(lhs.x, lhs.x + lhs.w, rhs.x, rhs.x + rhs.w) &&
        contains_range(lhs.y, lhs.y + lhs.h, rhs.y, rhs.y + rhs.h);
}

export function rect_contains_point(lhs: Rect, rhs: Point): boolean {
    return contains_point(lhs.x, lhs.x + lhs.w, rhs.x) &&
        contains_point(lhs.y, lhs.y + lhs.h, rhs.y);
}

export enum PathCamp { Subject, Clip }

export type PathCmd =
    { type: "L", x: number, y: number } |
    { type: "Q", x: number, y: number, x1: number, y1: number } |
    { type: "C", x: number, y: number, x1: number, y1: number, x2: number, y2: number }

export type Segment = {

    get type(): 'L' | 'Q' | 'C'

    bbox(): Rect & { x2: number, y2: number };
    intersect(seg: Segment, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[];
    coincident(seg: Segment): { type: "coincident", t0: number, t1: number, t2: number, t3: number } | undefined
    locate(p: Point): number[];
    split(t: number): Segment[];

    intersect2(rect: Rect): boolean;

    pointAt(t: number): Point;

    get from(): Point;
    get to(): Point;

    reverse(): Segment;
    toCmd(): PathCmd;
}


export function solveQuadraticEquation(b: number, c: number, d: number) {
    if (float_eq(b, 0)) {
        // in fact, this is not a quadratic curve either.
        if (float_eq(c, 0)) {
            // in fact in fact, there are no solutions.
            return [];
        }
        // linear solution:
        return [-d / c];
    }
    // quadratic solution:
    const q = Math.sqrt(c * c - 4 * b * d);
    const a2 = 2 * b;
    if (float_eq(q, 0)) {
        return [-c / a2]
    }
    return [(q - c) / a2, (-c - q) / a2].sort((a, b) => a - b);
}

function crt(v: number) {
    return v < 0 ? -Math.pow(-v, 1 / 3) : Math.pow(v, 1 / 3);
}
const tau = 2 * Math.PI;
// Cardano's mathematical formula
export function solveCubicEquation(a: number, b: number, c: number, d: number): number[] {
    if (float_eq(a, 0)) {
        return solveQuadraticEquation(b, c, d)
    }
    if (float_eq(d, 0)) {
        return [0, ...solveQuadraticEquation(a, b, c)].filter((v, i, arr) => {
            return arr.indexOf(v) === i
        }).sort((a, b) => a - b);
    }
    // Cardano's algorithm
    b /= a;
    c /= a;
    d /= a;

    const p = (3 * c - b * b) / 3,
        p3 = p / 3,
        q = (2 * b * b * b - 9 * b * c + 27 * d) / 27,
        q2 = q / 2,
        discriminant = q2 * q2 + p3 * p3 * p3;
    let roots: number[];

    let u1, v1, x1, x2, x3;
    if (discriminant < 0) {
        const mp3 = -p / 3,
            mp33 = mp3 * mp3 * mp3,
            r = Math.sqrt(mp33),
            t = -q / (2 * r),
            cosphi = t < -1 ? -1 : t > 1 ? 1 : t,
            phi = Math.acos(cosphi),
            crtr = crt(r),
            t1 = 2 * crtr;
        x1 = t1 * Math.cos(phi / 3) - b / 3;
        x2 = t1 * Math.cos((phi + tau) / 3) - b / 3;
        x3 = t1 * Math.cos((phi + 2 * tau) / 3) - b / 3;
        roots = [x1, x2, x3];
    } else if (discriminant === 0) {
        u1 = q2 < 0 ? crt(-q2) : -crt(q2);
        x1 = 2 * u1 - b / 3;
        x2 = -u1 - b / 3;
        roots = [x1, x2];
    } else {
        const sd = Math.sqrt(discriminant);
        u1 = crt(-q2 + sd);
        v1 = crt(q2 + sd);
        roots = [u1 - v1 - b / 3];
    }
    return roots.filter((v, i, arr) => {
        return arr.indexOf(v) === i
    }).sort((a, b) => a - b);
}

export function dist(p1: Point, p2: Point) {
    const dx = p1.x - p2.x,
        dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function align(points: Point[], line: Line) {
    const tx = line.p1.x;
    const ty = line.p1.y;
    const a = -Math.atan2(line.p2.y - ty, line.p2.x - tx);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const d = (v: Point) => {
        const x = v.x - tx;
        const y = v.y - ty;
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos,
        }
    }
    return points.map(d);
}

export function alignX(points: Point[], line: Line) {
    const tx = line.p1.x;
    const ty = line.p1.y;
    const a = -Math.atan2(line.p2.y - ty, line.p2.x - tx);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const d = (v: Point) => {
        const x = v.x - tx;
        const y = v.y - ty;
        return x * sin + y * cos // y
    }
    return points.map(d);
}

export function isLine(points: Point[]) {
    const order = points.length - 1;
    const aligned = align(points, { p1: points[0], p2: points[order] });
    const baselength = dist(points[0], points[order]);
    return aligned.reduce((t, p) => t + Math.abs(p.y), 0) < Math.max(float_accuracy, baselength / 1000); // 压扁了的
}

export function splits<T extends Segment>(_this: T, ts: number[]): T[] {
    const ret = []
    // ts需要由小到大
    ts = ts.slice(0).sort((a, b) => a - b)
    let curve: T = _this
    for (let i = 0, len = ts.length; i < len; ++i) {
        const t = ts[i];
        if (float_eq(t, 1)) break;
        const sp = curve.split(t) as T[];
        curve = sp[sp.length - 1];
        ret.push(...sp.slice(0, sp.length - 1))
        for (let j = i + 1; j < len; ++j) ts[j] = (ts[j] - t) / (1 - t);
    }
    if (curve !== _this) {
        ret.push(curve)
    }
    return ret;
}


export function reduice_bbox(arr: { bbox(): Rect & { x2: number, y2: number } }[]): Rect & { x2: number, y2: number } {
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
    if (bbox) {
        bbox.w = bbox.x2 - bbox.x;
        bbox.h = bbox.y2 - bbox.y;
        return bbox;
    }
    return { x: 0, y: 0, w: 0, h: 0, x2: 0, y2: 0 }
}