import { Bezier3 } from "./bezier3";

describe(`bezier3`, () => {
    test('extream', () => {
        const b = new Bezier3({ x: 330, y: 592 }, { x: 330, y: 557 }, { x: 315, y: 522 }, { x: 315, y: 485 });
        const e = b.extrema();
        expect(e.length).toBe(2); // Extrema test curve has three extrema
        expect(Math.abs(e[0])).toBe(0); // Extrema test curve value 1 is zero, but see https://github.com/facebook/jest/issues/12221
        expect(e[1]).toBe(1);
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
})