import { Point, Rect } from "./types";

export class Line {
    p1: Point
    p2: Point
    _bbox: Rect

    constructor(p1: Point, p2: Point)
    constructor(x1: number, y1: number, x2: number, y2: number)
    constructor(...args: any[]) {
        if (args.length === 2) {
            this.p1 = args[0]
            this.p2 = args[1]
        } else {
            this.p1 = { x: args[0], y: args[1] }
            this.p2 = { x: args[2], y: args[3] }
        }

        const x = Math.min(this.p1.x, this.p2.x)
        const y = Math.min(this.p1.y, this.p2.y)
        const w = Math.max(this.p1.x, this.p2.x) - x;
        const h = Math.max(this.p1.y, this.p2.y) - y;
        this._bbox = { x, y, w, h }
    }

    bbox() {
        return this._bbox;
    }

    split(t: number): Line[] {
        if (t <= 0 || t >= 1) return [this]
        const x = this.p1.x + t * (this.p2.x - this.p1.x)
        const y = this.p1.y + t * (this.p2.y - this.p1.y)

        return [new Line(this.p1.x, this.p1.y, x, y), new Line(x, y, this.p2.x, this.p2.y)]
    }

    get type() {
        return "L"
    }
}