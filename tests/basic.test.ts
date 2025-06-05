/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import { intersect_rect } from "../src/basic"

describe(`basic`, () => {
    test('intersect_rect', () => {
        expect(intersect_rect({ x: 25, y: 25, w: 0, h: 25 }, { x: 25, y: 25, w: 25, h: 25, })).toBe(true)
        expect(intersect_rect({ x: 25, y: 25, w: 0, h: 25 }, { x: 25, y: 50, w: 25, h: 25, })).toBe(true)
    })
})