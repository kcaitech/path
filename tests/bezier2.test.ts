/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { float_accuracy, float_eq } from "../src/basic";
import { Bezier2 } from "../src/bezier3";

// import { Bezier } from "../src/bezierjs/src/bezier"

describe(`bezier2`, () => {
    test('extrema', () => {
        const points = [
            {
              x: 37.6308,
              y: 38.4167,
            },
            {
              x: -39.7065,
              y: 257.219,
            },
            {
              x: 37.8083,
              y: 349.394,
            },
          ]
          const bezier2 = new Bezier2(points[0], points[1], points[2])
          const extrema = bezier2.extrema()
          expect(extrema.length).toBe(1)
          expect(float_eq(extrema[0], 0.4994268724802569)).toBe(true)
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