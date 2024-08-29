class GridItem<T> {
    data: T[] = []
    constructor(public x: number, public y: number, public w: number, public h: number) { }
}

class Grid<T> extends GridItem<T> {
    row_h: number
    col_w: number
    constructor(public x: number, public y: number, public w: number, public h: number, public row_count: number, public col_count: number) {
        super(x, y, w, h)
        this.row_h = Math.ceil(h / row_count);
        this.col_w = Math.ceil(w / col_count);
    }

    itemAt(row: number, col: number) {
        
    }
}