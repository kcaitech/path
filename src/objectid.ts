/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */


let gObjectId = 0;
const __id__ = "__object_id__"

export function objectId(obj: any): number {
    return obj[__id__] ?? (obj[__id__] = gObjectId++);
}
