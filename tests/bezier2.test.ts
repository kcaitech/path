import { float_accuracy } from "../src/basic";
import { Bezier2 } from "../src/bezier3";

describe(`bezier2`, () => {
    test('extream', () => {

    })
    test('pointAt', () => {
        
    })
    test('bbox', () => {

    })
    test('split', () => {
        
    })
    test('intersect', () => {
        
    })
    test('locate', () => {
        const b = new Bezier2({ x: 330, y: 592 }, { x: 330, y: 557 }, { x: 315, y: 485 });
        const l0 = b.locate({ x: 330, y: 592 })
        expect(l0.length).toBe(1);
        expect(Math.abs(l0[0]) < float_accuracy).toBe(true);

        const l1 = b.locate({ x: 315, y: 485 })
        expect(l1.length).toBe(1);
        expect(Math.abs(l1[0] - 1) < float_accuracy).toBe(true);
    })
})