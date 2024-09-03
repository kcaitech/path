import { float_accuracy, Point, Rect, Segment } from "./basic";

export class Line implements Segment {
    p1: Point
    p2: Point
    _bbox: Rect
    color?: number
    origin?: { segment: Segment; t0: number; t1: number; };

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

        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        if (dx === 0 && dy === 0) throw new Error("point");

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

    get type(): "L" {
        return "L"
    }

    locate(p: Point): number[] {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        if (dx === 0) { // 垂直竖线
            if (Math.abs(p.x - this.p1.x) > float_accuracy) return []
            const t = (p.y - this.p1.y) / dy;
            if (t >= 0 && t <= 1) return [t]
        } else {
            const t = (p.x - this.p1.x) / dx;
            if (t >= 0 && t <= 1) {
                const y = this.p1.y + dy * t;
                if (Math.abs(p.y - y) < float_accuracy) return [t]
            }
        }
        return []
    }

    intersect(seg: Segment): ({ type: "overlap", t0: number, t1: number, t3: number, t4: number } | { type: "intersect", t0: number, t1: number })[] { // 三种情况: 相交、不相交、重合
        if (seg.type !== 'L') return seg.intersect(this);

        const rhs = seg as Line;
        // line intersect
        const lli8 = function (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
            const nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
                ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4),
                d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); // 法向量
            if (d === 0) {
                // 平行
                // 判断是否重合
                return false
            }
            return { x: nx / d, y: ny / d }
        }

        const lli4 = function (p1: Point, p2: Point, p3: Point, p4: Point) {
            const x1 = p1.x, y1 = p1.y,
                x2 = p2.x, y2 = p2.y,
                x3 = p3.x, y3 = p3.y,
                x4 = p4.x, y4 = p4.y;
            return lli8(x1, y1, x2, y2, x3, y3, x4, y4)
        }

        const lli = function (line1: Line, line2: Line) {
            return lli4(line1.p1, line1.p2, line2.p1, line2.p2)
        }
        // return lli(this, rhs)

        throw new Error("Method not implemented.");
    }
}