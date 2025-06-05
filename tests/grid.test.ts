/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import { Line } from "../src/line";
import { Grid } from "../src/grid";
import { PathCamp } from "../src/basic";


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

    test('adds', () => {
        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);
        const line = new Line({ x: 25, y: 25 }, { x: 25, y: 50 })
        grid.adds([line], line.bbox());

        // 因为float误差，line会存在于下面item中
        const result = [
            {i: 0, j: 0},
            {i: 1, j: 0},
            {i: 2, j: 0},
            {i: 0, j: 1},
            {i: 1, j: 1},
            {i: 2, j: 1},
        ]
        grid.forEach((item, i, j) => {
            expect(item !== undefined).toBe(true)
            const idx = result.findIndex((v) => v.i === i && v.j === j)
            if (idx >= 0) {
                expect(item?.data.length).toBe(1)
                expect(item?.data[0].seg).toBe(line)
            } else {
                expect(item?.data.length).toBe(0)
            }
        })
    })

    test('evenodd', () => {
        const grid = new Grid(0, 0, 100, 100)
        grid.split(4, 4);
        expect(grid.evenodd({ x: 0, y: 0 }, PathCamp.Subject)).toBe(false)
    })
})