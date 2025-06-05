/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */


let gObjectId = 0;
const __id__ = "__object_id__"

export function objectId(obj: any): number {
    return obj[__id__] ?? (obj[__id__] = gObjectId++);
}
