export const float_accuracy = 1e-7;

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

    intersect(seg: Segment): ({ type: "overlap", t0: number, t1: number, t3: number, t4: number } | { type: "intersect", t0: number, t1: number })[];
    locate(p: Point): number[];
    split(t: number): Segment[];
}