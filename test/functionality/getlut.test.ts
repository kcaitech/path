import { Bezier } from "../../src/bezier";

describe(`getLut`, () => {
    test(`getLUT(n) yields n+1 points`, () => {
        const b = new Bezier({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 });
        const lut = b.getLUT(100);
        expect(lut.length).toBe(101);
    });
});
