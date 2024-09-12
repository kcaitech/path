import { Line } from "../src/line";
import { float_accuracy, float_eq, solveCubicEquation } from "../src/basic";
import { Bezier3 } from "../src/bezier3";

describe(`bezier3`, () => {
    test('extream', () => {
        const b = new Bezier3({ x: 330, y: 592 }, { x: 330, y: 557 }, { x: 315, y: 522 }, { x: 315, y: 485 });
        const e = b.extrema();
        expect(e.length).toBe(0); // Extrema test curve has three extrema
        // expect(Math.abs(e[0])).toBe(0); // Extrema test curve value 1 is zero, but see https://github.com/facebook/jest/issues/12221
        // expect(e[1]).toBe(1);
    })
    test('pointAt', () => {

    })
    test('bbox', () => {
        const b = new Bezier3({ x: 330, y: 592 }, { x: 330, y: 557 }, { x: 315, y: 522 }, { x: 315, y: 485 });
        const bbox = b.bbox();
        expect(bbox.x).toBe(315);
        expect(bbox.y).toBe(485);
        expect(bbox.w).toBe(330 - 315);
        expect(bbox.h).toBe(592 - 485);
    })
    test('split', () => {

    })
    test('intersect', () => {

    })
    test('locate', () => {
        const b = new Bezier3({ x: 330, y: 592 }, { x: 330, y: 557 }, { x: 315, y: 522 }, { x: 315, y: 485 });
        const l0 = b.locate({ x: 330, y: 592 })
        expect(l0.length).toBe(1);
        expect(Math.abs(l0[0]) < float_accuracy).toBe(true);

        const l1 = b.locate({ x: 315, y: 485 })
        expect(l1.length).toBe(1);
        expect(Math.abs(l1[0] - 1) < float_accuracy).toBe(true);
    })

    test('solveCubicEquation', () => {
        const testCases = [
            { a: 1, b: -6, c: 11, d: -6, expected: [1, 2, 3] },
            { a: 1, b: 0, c: 0, d: 0, expected: [0] },
            { a: 1, b: -3, c: 3, d: -1, expected: [1] },
            { a: 1, b: 0, c: -3, d: -2, expected: [-1, 2] }, // 
            { a: 1, b: -3, c: 3, d: 1, expected: [-0.2599210498948732] }, //
            { a: 30, b: -45, c: 0, d: 0, expected: [0, 1.5] },
            { a: 1, b: 0, c: -15, d: -4, expected: [-2 - Math.sqrt(3), -2 + Math.sqrt(3), 4] }
        ];

        // 先检查下testcase
        testCases.forEach((c) => {
            c.expected.forEach((x) => {
                const v = c.a * x ** 3 + c.b * x ** 2 + c.c * x + c.d;
                expect(Math.abs(v) < float_accuracy).toBe(true)
            })
        })

        const test = (c: { a: number, b: number, c: number, d: number, expected: number[] }) => {
            const s = solveCubicEquation(c.a, c.b, c.c, c.d)
            // const s = _s.filter((v, i) => _s.indexOf(v) === i)
            expect(s.length).toBe(c.expected.length);
            s.forEach((v, i) => {
                expect(Math.abs(v - c.expected[i]) < float_accuracy).toBe(true)
            })
        }

        testCases.forEach(test)
    })

    test('intersect', () => {
        const p1 = [
            { x: 50, y: 100, },
            { x: 77.58923888895069, y: 100, },
            { x: 100, y: 77.58923888895069, },
            { x: 100, y: 50, },
        ]
        const p2 = [
            { x: 77.00947343751739, y: 78, },
            { x: 77.00947343751739, y: 105, }
        ]

        const c1 = new Bezier3(p1[0], p1[1], p1[2], p1[3])
        const c2 = new Line(p2[0], p2[1])

        const intersect = c1.intersect(c2);

        expect(intersect.length).toBe(1)
        expect(intersect[0].type).toBe('intersect')
        expect(float_eq(intersect[0].t0, 0.36046984388219033)).toBe(true)
        expect(float_eq(intersect[0].t1, 0.5211510675840835)).toBe(true)
    })

    test('intersect 2', () => {
        const p1 = [
            { x: 96, y: 81, },
            { x: 96, y: 72.7232283333148, },
            { x: 89.2767716666852, y: 66, },
            { x: 81, y: 66, },
        ]
        const p2 = [
            { x: 50, y: 100, },
            { x: 77.58923888895069, y: 100, },
            { x: 100, y: 77.58923888895069, },
            { x: 100, y: 50, },
        ]
        const c1 = new Bezier3(p1[0], p1[1], p1[2], p1[3])
        const c2 = new Bezier3(p2[0], p2[1], p2[2], p2[3])

        const intersect = c1.intersect(c2);

        expect(intersect.length).toBe(1)
        expect(intersect[0].type).toBe('intersect')
        expect(float_eq(intersect[0].t0, 0.3524198532104492)).toBe(true)
        expect(float_eq(intersect[0].t1, 0.09022116661071777)).toBe(true)
    })
})