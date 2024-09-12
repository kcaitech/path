import { Bezier } from "../../src/bezier";

describe(`Higher order curves`, () => {
    describe(`higher order in 2d`, () => {
        test(`serializes correctly`, () => {
            const b = new Bezier([
                { x: 0, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 1 },
                { x: 1, y: 2 },
                // { x: 2, y: 2 },
            ]);

            expect(b.toString()).toBe("[0/0, 0/1, 1/1, 1/2]");
        });
    });

    describe(`higher order in 3d`, () => {
        const b = new Bezier([
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            // { x: 2, y: 2 },
            // { x: 2, y: 3 },
        ]);

        test(`serializes correctly`, () => {
            expect(b.toString()).toBe(
                "[0/0, 0/1, 1/1, 1/2]"
            );
        });

        // test(`has the expected midpoint`, () => {
        //     const t5 = b.compute(0.5);
        //     expect(t5.x).toBe(1);
        //     expect(t5.y).toBe(1.5);
        // });
    });
});
