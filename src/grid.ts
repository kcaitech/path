import { PathCamp, Rect, Segment } from "./basic"
import { objectId } from "./objectid"

export interface SegmentNode {
    seg: Segment,
    // t0: number,
    // t1: number,
    parent?: SegmentNode,
    childs?: SegmentNode[], // 被分割的子路径
    camp: PathCamp,
    // grid: Grid
    color?: number
    removed?: boolean
    coincident?: boolean // 不同camp重合的
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

    constructor(x: number, y: number, w: number, h: number, level: number = 0, row_count: number = 1, col_count: number = 1) {
        // 修正下x,y,w,h?
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.row_count = row_count;
        this.col_count = col_count;
        this.row_h = Math.ceil(h / row_count);
        this.col_w = Math.ceil(w / col_count);
        this.level = level;
        this.expandable = level === 0;
        if (row_count > 1 || col_count > 1) this.initItems(row_count, col_count);
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

    private _add2item(data: SegmentNode) {
        const items = this.items!;
        const bbox = data.seg.bbox(); // 可以超出当前grid范围的
        if (bbox.w === 0 && bbox.h === 0) return;

        const ci = Math.max(0, Math.floor((bbox.x - this.x) / this.col_w));
        const ri = Math.max(0, Math.floor((bbox.y - this.y) / this.row_h));

        const ce = Math.min(this.col_count, Math.ceil((bbox.x + bbox.w - this.x) / this.col_w));
        const re = Math.min(this.row_count, Math.ceil((bbox.y + bbox.h - this.y) / this.row_h));

        for (let i = ri; i < re; ++i) {
            for (let j = ci; j < ce; ++j) {
                const idx = i * this.col_count + j;
                const item = items[idx];
                // todo

                if (data.seg.intersect2(item)) {
                    // item.add(data.seg, data.camp, data)
                    // item.data.push(data)
                    item.add(data)
                }

                // const childs = data.seg.clip(item);
                // childs.forEach(c => {
                //     data.childs.push(item.add(c.seg, data.camp, data, c.t0, c.t1))
                // })
            }
        }
    }

    private _newItem(x: number, y: number) {
        return new Grid(x, y, this.col_w, this.row_h, this.level + 1);
    }

    private add(node: SegmentNode) {
        // const node: SegmentNode = {
        //     seg: data,
        //     parent,
        //     // t0: t0 ?? 0,
        //     // t1: t1 ?? 1,
        //     // childs: [],
        //     camp: camp ?? PathCamp.Subject,
        //     grid: this
        // }
        this.data.push(node);
        this.dataMap.set(objectId(node), node)
        // const bbox = data.bbox();
        // if (this.expandable) {
        //     this.expand(bbox.x, bbox.y, bbox.w, bbox.h);
        // } else {
        //     // if (!contains_rect(this, bbox)) throw new Error();
        // }
        if (this.items) this._add2item(node);
        return node;
    }

    adds(data: Segment[], bbox: Rect, camp?: PathCamp) {
        if (this.expandable) {
            this.expand(bbox.x, bbox.y, bbox.w, bbox.h);
        } else {
            // if (!contains_rect(this, bbox)) throw new Error();
        }
        return data.map(d => {
            const node: SegmentNode = {
                seg: d,
                // childs: [],
                camp: camp ?? PathCamp.Subject,
                // grid: this
                color: 0
            }
            this.add(node);
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
}