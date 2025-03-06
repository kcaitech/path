/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { intersect_rect } from "../src/basic"

describe(`basic`, () => {
    test('intersect_rect', () => {
        expect(intersect_rect({ x: 25, y: 25, w: 0, h: 25 }, { x: 25, y: 25, w: 25, h: 25, })).toBe(true)
        expect(intersect_rect({ x: 25, y: 25, w: 0, h: 25 }, { x: 25, y: 50, w: 25, h: 25, })).toBe(true)
    })
})