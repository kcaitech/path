/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { float_accuracy, float_eq, PathCamp, Point, point_eq, Rect, rect_contains_point, Segment } from "./basic"
import { Line } from "./line"
import { objectId } from "./objectid"

export interface SegmentNode {
    seg: Segment,
    t0: number,
    t1: number,
    parent?: SegmentNode,
    childs?: SegmentNode[], // 被分割的子路径
    camp: PathCamp,
    // grid: Grid
    color?: number
    removed?: boolean
    coincident?: boolean // 不同camp重合的
}

// const clampsidep = {
//     left: (p: Point, grid: Grid) => { return { x: Math.min(p.x, grid.x + grid.w), y: p.y } },
//     top: (p: Point, grid: Grid) => { return { x: p.x, y: Math.min(p.y, grid.y + grid.h) } },
//     right: (p: Point, grid: Grid) => { return { x: Math.max(p.x, grid.x), y: p.y } },
//     bottom: (p: Point, grid: Grid) => { return { x: p.x, y: Math.max(p.y, grid.y) } }
// }

const rayend = {
    left: (p: Point, grid: Grid) => { return { x: Math.min(p.x, grid.x - 1), y: p.y } },
    top: (p: Point, grid: Grid) => { return { x: p.x, y: Math.min(p.y, grid.y - 1) } },
    right: (p: Point, grid: Grid) => { return { x: Math.max(p.x, grid.x + grid.w + 1), y: p.y } },
    bottom: (p: Point, grid: Grid) => { return { x: p.x, y: Math.max(p.y, grid.y + grid.h + 1) } }
}

type EvenOdd = {
    count: number,
    in_left: number,
    in_right: number,
    out_left: number,
    out_right: number
}

const ctrlPointOfBegin = (seg: Segment): Point | undefined => {
    let i = seg.points.length - 2
    let p = seg.points[i]
    const last = seg.points[seg.points.length - 1]
    while (i >= 0 && point_eq(p, last)) {
        --i
        p = seg.points[i]
    }
    return p
}

const ctrlPointOfEnd = (seg: Segment): Point | undefined => {
    let i = 1
    let p = seg.points[i]
    const first = seg.points[0]
    while (i < seg.points.length && point_eq(p, first)) {
        ++i
        p = seg.points[i]
    }
    return p
}

const calcZ = (p: Point, ray: Line) => {
    const a = ray.from
    const b = ray.to
    const z = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
    return z
}

const calcLR = (p: Point, ray: Line) => {
    const z = calcZ(p, ray)
    if (z > 0) { // left
        return 'R' // 与y向上的坐标系是反过来的
    } else if (z < 0) { // right
        return 'L'
    }
}

const calcLeftOrRightIn = (s: Segment, ray: Line) => {
    const p = ctrlPointOfBegin(s)
    if (!p) return // 退化为一个点
    return calcLR(p, ray)
}

const calcLeftOrRightOut = (s: Segment, ray: Line) => {
    const p = ctrlPointOfEnd(s)
    if (!p) return // 退化为一个点
    return calcLR(p, ray)
}

const mergeEvenOdd = (evenodd: EvenOdd): number => {
    // 穿过的情况
    let count = evenodd.count
    const left_throuth = Math.min(evenodd.in_left, evenodd.out_right)
    count += left_throuth
    evenodd.in_left -= left_throuth
    evenodd.out_right -= left_throuth
    const right_throuth = Math.min(evenodd.in_right, evenodd.out_left)
    count += right_throuth
    evenodd.in_right -= right_throuth
    evenodd.out_left -= right_throuth

    // 其它
    count += evenodd.in_left + evenodd.in_right + evenodd.out_left + evenodd.out_right
    return count
}

// 考虑float精度
const _float_offset_p: { [key: string]: (p: Point) => Point } = {}
_float_offset_p['left'] = function (p: Point) {
    return { x: p.x + float_accuracy, y: p.y } // 往右偏移点
}
_float_offset_p['top'] = function (p: Point) {
    return { x: p.x, y: p.y + float_accuracy } // 往下偏移点
}
_float_offset_p['right'] = function (p: Point) {
    return { x: p.x - float_accuracy, y: p.y }  // 往左偏移点
}
_float_offset_p['bottom'] = function (p: Point) {
    return { x: p.x, y: p.y - float_accuracy }  // 往上偏移点
}
const float_offset_p = (p: Point, side: 'left' | 'top' | 'right' | 'bottom') => {
    return _float_offset_p[side](p)
}

const _evenodd = (grid: Grid, camp: PathCamp, ray: Line, side: 'left' | 'top' | 'right' | 'bottom', color: number): EvenOdd => {
    const result: EvenOdd = { count: 0, in_left: 0, in_right: 0, out_left: 0, out_right: 0 }
    if (grid.items) {
        // const p = clampsidep[side](ray.p1, grid);
        const iter = grid.iterFrom(float_offset_p(ray.p1, side));
        while (iter.item) {
            const r = _evenodd(iter.item, camp, ray, side, color);
            result.count += r.count
            result.in_left += r.in_left
            result.in_right += r.in_right
            result.out_left += r.out_left
            result.out_right += r.out_right
            iter[side]();
        }
        return result;
    }

    const pending = grid.data.filter(d => d.camp === camp && d.color !== color);
    pending.forEach(d => {
        d.color = color;

        let s = d.seg;
        if (s.type !== 'L' && !rect_contains_point(s.bbox(), ray.p1)) { // 不包含点时，只要判断下segment的起点跟终点是否与射线相交
            const p1 = s.from;
            const p2 = s.to;
            s = new Line(p1, p2);
        }
        const coincident = ray.coincident(s);
        if (coincident) {
            return
        }
        const intersect = ray.intersect(s, true) as { type: "intersect"; t0: number; t1: number; }[];
        intersect.forEach(i => {
            if (float_eq(i.t1, 0)) {
                // out
                const lr = calcLeftOrRightOut(s, ray)
                if (lr === 'L') {
                    result.out_left++
                }
                else if (lr === 'R') {
                    result.out_right++
                }
            } else if (float_eq(i.t1, 1)) {
                // in
                const lr = calcLeftOrRightIn(s, ray)
                if (lr === 'L') {
                    result.in_left++
                }
                else if (lr === 'R') {
                    result.in_right++
                }
            } else {
                result.count++
            }
        })
    })
    return result;
}

export class Grid implements Rect {
    x: number
    y: number
    w: number
    h: number
    level: number
    row_count: number
    col_count: number
    row_h: number
    col_w: number

    data: SegmentNode[] = []
    dataMap: Map<number, SegmentNode> = new Map();
    items?: Grid[]

    expandable: boolean
    color: number = 0

    constructor(x: number, y: number, w: number, h: number, level: number = 0, row_count: number = 1, col_count: number = 1) {
        // 修正下x,y,w,h?
        this.x = x;
        this.y = y;
        this.row_count = row_count;
        this.col_count = col_count;
        this.row_h = Math.ceil(h / row_count);
        this.col_w = Math.ceil(w / col_count);
        this.w = col_count * this.col_w;
        this.h = row_count * this.row_h;
        this.level = level;
        this.expandable = level === 0;
        if (row_count > 1 || col_count > 1) this.initItems(row_count, col_count);
    }

    rm(data: SegmentNode) {
        if (!this.dataMap.has(objectId(data))) return;

        const idx = this.data.indexOf(data);
        this.data.splice(idx, 1);
        this.dataMap.delete(objectId(data));

        if (!this.items) return;

        const bbox = data.seg.bbox(); // 可以超出当前grid范围的
        if (float_eq(bbox.w, 0) && float_eq(bbox.h, 0)) return;

        // 考虑float误差
        const x = bbox.x - float_accuracy
        const y = bbox.y - float_accuracy
        const r = bbox.x + bbox.w + float_accuracy
        const b = bbox.y + bbox.h + float_accuracy

        const ci = Math.max(0, Math.floor((x - this.x) / this.col_w));
        const ri = Math.max(0, Math.floor((y - this.y) / this.row_h));

        const ce = Math.min(this.col_count, Math.floor((r - this.x) / this.col_w + 1));
        const re = Math.min(this.row_count, Math.floor((b - this.y) / this.row_h + 1));
        const items = this.items;
        for (let i = ri; i < re; ++i) {
            for (let j = ci; j < ce; ++j) {
                const idx = i * this.col_count + j;
                const item = items[idx];
                item.rm(data)
            }
        }
    }

    private initItems(row_count: number, col_count: number) {
        this.items = [];
        for (let i = 0; i < row_count; ++i) {
            for (let j = 0; j < col_count; ++j) {
                const x = j * this.col_w + this.x;
                const y = i * this.row_h + this.y;
                this.items.push(new Grid(x, y, this.col_w, this.row_h, this.level + 1));
            }
        }
    }

    iterFrom(p: Point) {
        let ci = Math.max(0, Math.floor((p.x - this.x) / this.col_w));
        let ri = Math.max(0, Math.floor((p.y - this.y) / this.row_h));
        let grid = this;
        let idx = ri * this.col_count + ci;
        const items = this.items || [];
        return {
            item: items[idx],
            hasLeft() {
                return items.length > 0 && ci > 0
            },
            left() {
                --ci;
                idx = ri * grid.col_count + ci;
                this.item = items[idx]
                return this.item;
            },
            hasTop() {
                return items.length > 0 && ri > 0
            },
            top() {
                --ri;
                idx = ri * grid.col_count + ci;
                this.item = items[idx]
                return this.item;
            },
            hasRight() {
                return items.length > 0 && ci < grid.col_count;
            },
            right() {
                ++ci;
                idx = ri * grid.col_count + ci;
                this.item = items[idx]
                return this.item;
            },
            hasBottom() {
                return items.length > 0 && ri < grid.row_count;
            },
            bottom() {
                ++ri;
                idx = ri * grid.col_count + ci;
                this.item = items[idx]
                return this.item;
            }
        }
    }

    evenodd(p: Point, camp: PathCamp, side?: 'left' | 'top' | 'right' | 'bottom') {

        side = side || ([
            { side: 'left' as 'left', d: p.x - this.x },
            { side: 'top' as 'top', d: p.y - this.y },
            { side: 'right' as 'right', d: this.x + this.w - p.x },
        ] as { side: 'left' | 'top' | 'right' | 'bottom', d: number }[]).reduce((p, c) => {
            return (c.d < p.d) ? c : p;
        }, { side: 'bottom' as 'bottom', d: this.y + this.h - p.y }).side;

        const rayendp = rayend[side](p, this);
        const ray = new Line(p, rayendp)
        const result = _evenodd(this, camp, ray, side, ++this.color)
        const count = mergeEvenOdd(result);
        return count % 2 === 1
    }

    private _add2item(data: SegmentNode) {
        const items = this.items!;
        const bbox = data.seg.bbox(); // 可以超出当前grid范围的
        if (float_eq(bbox.w, 0) && float_eq(bbox.h, 0)) return;

        // 考虑float误差
        const x = bbox.x - float_accuracy
        const y = bbox.y - float_accuracy
        const r = bbox.x + bbox.w + float_accuracy
        const b = bbox.y + bbox.h + float_accuracy
        const ci = Math.max(0, Math.floor((x - this.x) / this.col_w));
        const ri = Math.max(0, Math.floor((y - this.y) / this.row_h));

        const ce = Math.min(this.col_count, Math.floor((r - this.x) / this.col_w + 1));
        const re = Math.min(this.row_count, Math.floor((b - this.y) / this.row_h + 1));

        for (let i = ri; i < re; ++i) {
            for (let j = ci; j < ce; ++j) {
                const idx = i * this.col_count + j;
                const item = items[idx];
                if (data.seg.intersect2(item)) {
                    item._add(data)
                }
            }
        }
    }

    private _newItem(x: number, y: number) {
        return new Grid(x, y, this.col_w, this.row_h, this.level + 1);
    }

    private _add(node: SegmentNode) {
        this.data.push(node);
        this.dataMap.set(objectId(node), node)
        if (this.items) this._add2item(node);
        return node;
    }

    add(data: Segment, camp?: PathCamp) {
        if (this.expandable) {
            const bbox = data.bbox();
            this.expand(bbox.x, bbox.y, bbox.w + 1, bbox.h + 1);
        }
        const node: SegmentNode = {
            seg: data,
            // childs: [],
            camp: camp ?? PathCamp.Subject,
            // grid: this,
            color: 0,
            t0: 0,
            t1: 1
        }
        this._add(node);
        return node;
    }

    adds(data: Segment[], bbox: Rect, camp?: PathCamp) {
        if (this.expandable) {
            this.expand(bbox.x, bbox.y, bbox.w + 1, bbox.h + 1);
        }
        return data.map(d => {
            const node: SegmentNode = {
                seg: d,
                // childs: [],
                camp: camp ?? PathCamp.Subject,
                // grid: this,
                color: 0,
                t0: 0,
                t1: 1
            }
            this._add(node);
            return node;
        })
    }

    itemAt(row: number, col: number) {
        if (!this.items) {
            if (row === 0 && col === 0) return this;
            return;
        }
        const idx = row * this.col_count + col;
        return this.items[idx];
    }

    split(row_count: number = 4, col_count: number = 4) {
        if (this.items) throw new Error();
        if (row_count <= 1 && col_count <= 1) return;

        this.row_h = Math.ceil(this.h / row_count);
        this.col_w = Math.ceil(this.w / col_count);

        this.row_count = row_count;
        this.col_count = col_count;
        this.initItems(row_count, col_count);
        for (let i = 0, len = this.data.length; i < len; ++i) {
            const data = this.data[i];
            this._add2item(data);
        }
    }

    expand(x: number, y: number, w: number, h: number) {
        if (!this.items) throw new Error();
        if (x < this.x) {
            // 扩展列
            const d = this.x - x;
            const c = Math.ceil(d / this.col_w);
            this.x -= c * this.col_w;
            this.w += c * this.col_w;
            this.col_count += c;
            // 在前面插入c列
            for (let i = 0; i < this.row_count; ++i) {
                const n: Grid[] = [];
                for (let k = 0; k < c; ++k) {
                    const x = k * this.col_w + this.x;
                    const y = i * this.row_h + this.y;
                    n.push(this._newItem(x, y));
                }
                const idx = i * this.col_count;
                this.items.splice(idx, 0, ...n)
            }
        }
        if (x + w > this.x + this.w) {
            // 扩展列
            const d = x + w - this.x - this.w;
            const c = Math.ceil(d / this.col_w);
            const savex = this.w + this.x;
            this.w += c * this.col_w;
            const save_col_count = this.col_count;
            this.col_count += c;
            // 在后面插入c列
            for (let i = 0; i < this.row_count; ++i) {
                const n: Grid[] = [];
                for (let k = 0; k < c; ++k) {
                    const x = k * this.col_w + savex;
                    const y = i * this.row_h + this.y;
                    n.push(this._newItem(x, y));
                }
                const idx = i * this.col_count + save_col_count;
                this.items.splice(idx, 0, ...n)
            }
        }
        if (y < this.y) {
            // 扩展行
            const d = this.y - y;
            const c = Math.ceil(d / this.row_h);
            this.y -= c * this.row_h;
            this.h += c * this.row_h;
            this.row_count += c;

            for (let i = 0; i < c; ++i) {
                const n: Grid[] = [];
                for (let k = 0; k < this.col_count; ++k) {
                    const x = k * this.col_w + this.x;
                    const y = i * this.row_h + this.y;
                    n.push(this._newItem(x, y));
                }
                const idx = i * this.col_count;
                this.items.splice(idx, 0, ...n);
            }
        }
        if (y + h > this.y + this.h) {
            // 扩展行
            const d = y + h - this.y - this.h;
            const c = Math.ceil(d / this.row_h);
            const savey = this.h + this.y;
            this.h += c * this.row_h;
            const row_start = this.items.length;
            this.row_count += c;
            for (let i = 0; i < c; ++i) {
                const n: Grid[] = [];
                for (let k = 0; k < this.col_count; ++k) {
                    const x = k * this.col_w + this.x;
                    const y = i * this.row_h + savey;
                    n.push(this._newItem(x, y));
                }
                const idx = i * this.col_count + row_start;
                this.items.splice(idx, 0, ...n)
            }
        }
    }

    forEach(f: (item: Grid, rowIdx: number, colIdx: number) => void) {
        if (!this.items) return;
        for (let i = 0; i < this.row_count; ++i) {
            for (let j = 0; j < this.col_count; ++j) {
                const idx = i * this.col_count + j;
                const item = this.items[idx];
                f(item, i, j);
            }
        }
    }
}