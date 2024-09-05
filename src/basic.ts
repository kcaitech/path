export const float_accuracy = 1e-7;

export function float_eq(a: number, b: number) {
    return Math.abs(a - b) < float_accuracy;
}

export type Point = {
    x: number;
    y: number;
}

export type Line = {
    p1: Point,
    p2: Point
}

export type Rect = {
    w: number
    h: number
} & Point


export function intersect_range(lx0: number, lx1: number, rx0: number, rx1: number): boolean {
    return lx0 < rx1 && lx1 > rx0;
}

export function contains_range(lx0: number, lx1: number, rx0: number, rx1: number): boolean {
    return lx0 <= rx0 && lx1 > rx1;
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

export type Segment = {
    origin?: {
        segment: Segment,
        t0: number,
        t1: number
    },
    bbox(): Rect;
    get type(): 'L' | 'Q' | 'C'
    color?: number;

    intersect(seg: Segment): ({ type: "overlap", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[];
    locate(p: Point): number[];
    split(t: number): Segment[];
}


export function solveQuadraticEquation(ax: number, bx: number, cx: number) {
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
    const cube_root = (x: number) => 0 <= x ? x ** (1 / 3) : (- ((-x) ** (1 / 3)))
    const delta = 18 * a * b * c * d - 4 * (b ** 3) * d + (b ** 2) * (c ** 2) - 4 * a * (c ** 3) - 27 * (a ** 2) * (d ** 2)
    const P = b ** 2 - 3 * a * c
    const Q = 9 * a * b * c - 2 * (b ** 3) - 27 * (a ** 2) * d
    if (delta > 0) {
        const D1 = (2 * (b / a) ** 3 - 9 * ((b / a) * (c / a)) + 27 * (d / a)) / 54
        const D2 = ((b / a) ** 2 - 3 * (c / a)) / 9
        const D2_sqrt = Math.sqrt(D2);
        const theta = Math.acos(D1 / Math.sqrt(D2 ** 3))
        const x1 = -2 * D2_sqrt * Math.cos(theta / 3) - b / 3
        const x2 = -2 * D2_sqrt * Math.cos((theta + 2 * Math.PI) / 3) - b / 3
        const x3 = -2 * D2_sqrt * Math.cos((theta - 2 * Math.PI) / 3) - b / 3
        roots = [x1, x2, x3]
    } else if (delta < 0) {
        const t = Math.sqrt((Q ** 2) / 4 - P ** 3);
        const N = cube_root(Q / 2 + t) + cube_root(Q / 2 - t)
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
        return x * cos - y * sin
    }
    return points.map(d);
}

export function isLine(points: Point[]) {
    const order = points.length - 1;
    const aligned = align(points, { p1: points[0], p2: points[order] });
    const baselength = dist(points[0], points[order]);
    return aligned.reduce((t, p) => t + Math.abs(p.y), 0) < baselength / 100; // 压扁了的
}