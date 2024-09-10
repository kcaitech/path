import { Bezier } from "../../src/bezier";

describe(`"linear" curves`, () => {
    const b = new Bezier({ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 100 });

    test(`serializes correctly`, () => {
        expect(b.toString()).toBe("[0/0, 50/50, 100/100]");
    });

    test(`midpoint is, indeed, the midpoint`, () => {
        const t5 = b.compute(0.5);
        expect(t5.x).toBe(50);
        expect(t5.y).toBe(50);
    });
});
