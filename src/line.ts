import { contains_point, contains_rect, float_accuracy, intersect_range, intersect_rect, PathCmd, Point, Rect, Segment } from "./basic";

export class Line implements Segment {
    // p1: Point
    // p2: Point
    points: Point[]
    _bbox?: Rect & { x2: number, y2: number }
    // color?: number
    // origin?: { segment: Segment; t0: number; t1: number; };

    constructor(p1: Point, p2: Point)
    constructor(x1: number, y1: number, x2: number, y2: number)
    constructor(...args: any[]) {
        if (args.length === 2) {
            this.points = args
        } else {
            this.points = [{ x: args[0], y: args[1] }, { x: args[2], y: args[3] }]
        }

        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        if (dx === 0 && dy === 0) {
            console.log(new Error().stack)
            throw new Error("line: invalid line");
        }
    }

    get p1() {
        return this.points[0];
    }
    get p2() {
        return this.points[1];
    }

    get from() {
        return this.points[0];
    }
    get to() {
        return this.points[1];
    }

    bbox() {
        if (this._bbox) return this._bbox;
        const x = Math.min(this.p1.x, this.p2.x)
        const y = Math.min(this.p1.y, this.p2.y)
        const x2 = Math.max(this.p1.x, this.p2.x)
        const y2 = Math.max(this.p1.y, this.p2.y)
        const w = x2 - x;
        const h = y2 - y;
        this._bbox = { x, y, w, h, x2, y2 }
        return this._bbox;
    }

    split(t: number): Line[] {
        if (t <= 0 || t >= 1) return [this]
        const x = this.p1.x + t * (this.p2.x - this.p1.x)
        const y = this.p1.y + t * (this.p2.y - this.p1.y)

        return [new Line(this.p1.x, this.p1.y, x, y), new Line(x, y, this.p2.x, this.p2.y)]
    }

    intersect2(rect: Rect): boolean {
        if (!intersect_rect(this.bbox(), rect)) return false;
        if (contains_rect(rect, this.bbox())) return true;
        const dx = this.p2.x - this.p1.x;

        if (dx === 0) { // 垂直竖线
            return contains_point(rect.x, rect.x + rect.w, this.p1.x) && intersect_range(rect.y, rect.y + rect.h, Math.min(this.p1.y, this.p2.y), Math.max(this.p1.y, this.p2.y));
        }
        const fix = function (t: number) {
            return t < 0 ? 0 : (t > 1 ? 1 : t);
        }
        const t0 = fix((rect.x - this.p1.x) / dx);
        const t1 = fix((rect.x + rect.w - this.p1.x) / dx);

        const p1 = this.pointAt(t0);
        const p2 = this.pointAt(t1);

        return intersect_range(rect.y, rect.y + rect.h, Math.min(p1.y, p2.y), Math.max(p1.y, p2.y))
    }

    get type(): "L" {
        return "L"
    }

    pointAt(t: number) {
        return {
            x: this.p1.x + (this.p2.x - this.p1.x) * t,
            y: this.p1.y + (this.p2.y - this.p1.y) * t
        }
    }

    locate(p: Point): number[] {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const fix = (t: number) => {
            if (Math.abs(t) < float_accuracy) t = 0;
            else if (Math.abs(t - 1) < float_accuracy) t = 1;
            return t;
        }
        if (dx === 0) { // 垂直竖线
            if (Math.abs(p.x - this.p1.x) > float_accuracy) return []
            const t = (p.y - this.p1.y) / dy;
            if (t > -float_accuracy && t < 1 + float_accuracy) {
                return [fix(t)]
            }
        } else {
            const t = (p.x - this.p1.x) / dx;
            if (t > -float_accuracy && t < 1 + float_accuracy) {
                const y = this.p1.y + dy * t;
                if (Math.abs(p.y - y) < float_accuracy) return [fix(t)]
            }
        }
        return []
    }

    lineDirection(p1: Point, p2: Point) {
        const v1x = this.p2.x - this.p1.x;
        const v1y = this.p2.y - this.p1.y;
        const v2x = p2.x - p1.x;
        const v2y = p2.y - p1.y;

        if (v1x * v2y === v1y * v2x) {
            // 判断方向是否相反
            return (v1x * v2x <= 0) && (v1y * v2y <= 0);
        }
        return false;
    }

    // 辅助函数判断两个点是否重合
    pointsCoincident(p1: Point, p2: Point) {
        return Math.abs(p1.x - p2.x) < float_accuracy && Math.abs(p1.y - p2.y) < float_accuracy;
    }
    coincident(seg: Segment): { type: "coincident"; t0: number; t1: number; t2: number; t3: number; } | undefined {
        if (seg.type !== 'L') {
            const ret = seg.coincident(this);
            if (ret) {
                return { type: 'coincident', t0: ret.t2, t1: ret.t3, t2: ret.t0, t3: ret.t1 }
            }
            return;
        }

        const rhs = seg as Line;
        if (!intersect_rect(this.bbox(), rhs.bbox())) return;

        const p1 = this.p1;
        const p2 = this.p2;
        const p3 = rhs.p1;
        const p4 = rhs.p2;
        const x1 = p1.x, y1 = p1.y,
            x2 = p2.x, y2 = p2.y,
            x3 = p3.x, y3 = p3.y,
            x4 = p4.x, y4 = p4.y;
        // line intersect
        const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); // 法向量
        if (d === 0) {
            // 平行且区间相交
            // 判断是否重合
            const l0 = this.locate(rhs.p1);
            const l1 = this.locate(rhs.p2);
            // 包含
            if (l0.length > 0 && l1.length > 0) return { type: "coincident", t0: l0[0], t1: l1[0], t2: 0, t3: 1 }
            const l2 = rhs.locate(this.p1);
            const l3 = rhs.locate(this.p2);
            // 包含
            if (l2.length > 0 && l3.length > 0)
                return { type: "coincident", t0: 0, t1: 1, t2: l2[0], t3: l3[0] };

            // 添加对单个端点重合的处理
            if (this.pointsCoincident(this.p1, rhs.p1) || this.pointsCoincident(this.p1, rhs.p2)) {
                return; // 只有 p1 和 rhs 的某个端点重合
            }
            if (this.pointsCoincident(this.p2, rhs.p1) || this.pointsCoincident(this.p2, rhs.p2)) {
                return; // 只有 p2 和 rhs 的某个端点重合
            }

            // if (l2.length > 0 && l3.length > 0) return [{ type: "coincident", t0: 0, t1: 1, t2: l2[0], t3: l3[0] }]
            // 部分重合
            if ((l0.length > 0 || l1.length > 0) && (l2.length > 0 || l3.length > 0)) {
                const dir_opposite = this.lineDirection(p3, p4);
                if (dir_opposite) {
                    // 两条线方向相反
                    return { type: "coincident", t0: l1[0] ?? 0, t1: l0[0] ?? 1, t2: l3[0] ?? 0, t3: l2[0] ?? 1 }
                } else {
                    return { type: "coincident", t0: l0[0] ?? 0, t1: l1[0] ?? 1, t2: l2[0] ?? 0, t3: l3[0] ?? 1 }
                }
            }
            // 不重合。这个存疑
        }
    }

    intersect(seg: Segment, noCoincident?: boolean): ({ type: "coincident", t0: number, t1: number, t2: number, t3: number } | { type: "intersect", t0: number, t1: number })[] { // 三种情况: 相交、不相交、重合
        if (seg.type !== 'L') {
            return seg.intersect(this, noCoincident).map(i => {
                if (i.type === 'coincident') {
                    const t2 = i.t2;
                    i.t2 = i.t0;
                    const t3 = i.t3;
                    i.t3 = i.t1;
                    i.t0 = t2;
                    i.t1 = t3;
                } else {
                    const t0 = i.t0;
                    i.t0 = i.t1;
                    i.t1 = t0;
                }
                return i;
            });
        }

        const rhs = seg as Line;
        if (!intersect_rect(this.bbox(), rhs.bbox())) return [];

        const p1 = this.p1;
        const p2 = this.p2;
        const p3 = rhs.p1;
        const p4 = rhs.p2;
        const x1 = p1.x, y1 = p1.y,
            x2 = p2.x, y2 = p2.y,
            x3 = p3.x, y3 = p3.y,
            x4 = p4.x, y4 = p4.y;
        // line intersect
        const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); // 法向量
        if (d === 0) {
            if (noCoincident) {
                return []
            }
            // 平行且区间相交
            // 判断是否重合
            const l0 = this.locate(rhs.p1);
            const l1 = this.locate(rhs.p2);
            // 包含
            if (l0.length > 0 && l1.length > 0) return [{ type: "coincident", t0: l0[0], t1: l1[0], t2: 0, t3: 1 }]
            const l2 = rhs.locate(this.p1);
            const l3 = rhs.locate(this.p2);

            // 添加对单个端点重合的处理
            if (this.pointsCoincident(this.p1, rhs.p1) || this.pointsCoincident(this.p1, rhs.p2)) {
                return []; // 只有 p1 和 rhs 的某个端点重合
            }
            if (this.pointsCoincident(this.p2, rhs.p1) || this.pointsCoincident(this.p2, rhs.p2)) {
                return []; // 只有 p2 和 rhs 的某个端点重合
            }
            // if (l2.length > 0 && l3.length > 0) return [{ type: "coincident", t0: 0, t1: 1, t2: l2[0], t3: l3[0] }]
            // 部分重合
            if ((l0.length > 0 || l1.length > 0) && (l2.length > 0 || l3.length > 0)) {
                const dir_opposite = this.lineDirection(p3, p4);
                if (dir_opposite) {
                    // 两条线方向相反
                    return [{ type: "coincident", t0: l1[0] ?? 0, t1: l0[0] ?? 1, t2: l3[0] ?? 0, t3: l2[0] ?? 1 }]
                } else {
                    return [{ type: "coincident", t0: l0[0] ?? 0, t1: l1[0] ?? 1, t2: l2[0] ?? 0, t3: l3[0] ?? 1 }]
                }
            }
            // 不重合。这个存疑
            return []
        }
        const nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
            ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4);
        const p = { x: nx / d, y: ny / d }
        let t0: number
        if (Math.abs(x1 - x2) < float_accuracy) {
            t0 = (p.y - y1) / (y2 - y1)
        } else {
            t0 = (p.x - x1) / (x2 - x1)
        }
        let t1: number
        if (Math.abs(x4 - x3) < float_accuracy) {
            t1 = (p.y - y3) / (y4 - y3)
        } else {
            t1 = (p.x - x3) / (x4 - x3)
        }

        const fix = (t: number) => {
            if (Math.abs(t) < float_accuracy) t = 0;
            else if (Math.abs(t - 1) < float_accuracy) t = 1;
            return t;
        }
        t0 = fix(t0)
        t1 = fix(t1)
        if (t0 >= 0 && t0 <= 1 && t1 >= 0 && t1 <= 1) return [{ type: "intersect", t0, t1 }]

        return []
    }

    reverse() {
        return new Line(this.p2, this.p1)
    }

    toCmd(): PathCmd {
        return { type: 'L', x: this.p2.x, y: this.p2.y }
    }

    clone() {
        return new Line(this.p1, this.p2)
    }
}