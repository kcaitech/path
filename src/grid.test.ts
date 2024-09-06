import { Grid } from "./grid";


function check_items(grid: Grid) {
    const items = grid.items!;
    for (let i = 0; i < grid.row_count; ++i) {
        for (let j = 0; j < grid.col_count; ++j) {
            const x = grid.x + j * grid.col_w;
            const y = grid.y + i * grid.row_h;
            const item = items[i * grid.col_count + j];
            expect(item.x).toEqual(x);
            expect(item.y).toEqual(y);
            expect(item.w).toEqual(grid.col_w);
            expect(item.h).toEqual(grid.row_h);
        }
    }
}

describe(`grid`, () => {
    
    test('init', () => {
        const grid = new Grid(0, 0, 100, 100)
        expect(grid.x).toEqual(0);
        expect(grid.y).toEqual(0);
    })

    test('split', () => {
        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);
        expect(grid.col_count).toEqual(4);
        expect(grid.row_count).toEqual(4);
        expect(grid.items?.length).toEqual(16);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        check_items(grid)
    })

    test('itemAt', () => {
        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);
        const items = grid.items!;
        for (let i = 0; i < grid.row_count; ++i) {
            for (let j = 0; j < grid.col_count; ++j) {
                const item = items[i * grid.col_count + j];
                expect(item).toStrictEqual(grid.itemAt(i, j));
            }
        }
    })

    test(`expand w`, () => {

        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);

        grid.expand(0, 0, 120, 100);

        expect(grid.col_count).toEqual(5);
        expect(grid.row_count).toEqual(4);
        expect(grid.items?.length).toEqual(20);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        check_items(grid)
    })

    test(`expand h`, () => {

        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);

        grid.expand(0, 0, 100, 120);

        expect(grid.col_count).toEqual(4);
        expect(grid.row_count).toEqual(5);
        expect(grid.items?.length).toEqual(20);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        check_items(grid)
    })

    
    test(`expand x`, () => {

        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);

        grid.expand(-20, 0, 100, 100);

        expect(grid.col_count).toEqual(5);
        expect(grid.row_count).toEqual(4);
        expect(grid.items?.length).toEqual(20);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        check_items(grid)
    })

    test(`expand y`, () => {

        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);

        grid.expand(0, -20, 100, 100);

        expect(grid.col_count).toEqual(4);
        expect(grid.row_count).toEqual(5);
        expect(grid.items?.length).toEqual(20);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        check_items(grid)
    })

    test(`expand`, () => {

        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);

        grid.expand(-20, -20, 150, 150);

        expect(grid.col_count).toEqual(7);
        expect(grid.row_count).toEqual(7);
        expect(grid.items?.length).toEqual(49);

        expect(grid.row_h).toEqual(25);
        expect(grid.col_w).toEqual(25);

        expect(grid.x).toEqual(-25);
        expect(grid.y).toEqual(-25);
        expect(grid.w).toEqual(175);
        expect(grid.h).toEqual(175);

        check_items(grid)
    })
})