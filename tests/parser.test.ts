/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import { Path } from "../src/path"

describe(`parser`, () => {
    test('pase', () => {
        const path = Path.fromSVGString('M0 0L100 0L100 25L25 25L25 100L0 100Z')
        expect(path.toSVGString()).toBe('M0 0L100 0L100 25L25 25L25 100L0 100Z')
    })

})