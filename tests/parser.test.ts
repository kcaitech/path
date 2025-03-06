/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { Path } from "../src/path"

describe(`parser`, () => {
    test('pase', () => {
        const path = Path.fromSVGString('M0 0L100 0L100 25L25 25L25 100L0 100Z')
        expect(path.toSVGString()).toBe('M0 0L100 0L100 25L25 25L25 100L0 100Z')
    })

})