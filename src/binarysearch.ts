/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { float_accuracy, float_accuracy6, float_eq, intersect_rect, point_eq, Segment, splits } from "./basic";


interface Bezier extends Segment {
    split(t: number): Bezier[]
    extrema(): number[]
}

// todo 迭代到分割点时，会多查找一次
const epsilon = float_accuracy6; // todo 误差会放大，尤其当相交点刚好是分割点时
// 去重
const accept = (v: { t0: number, t1: number }, i: number, arr: { t0: number, t1: number }[]) => arr.findIndex((v1) => Math.abs(v.t0 - v1.t0) < epsilon && Math.abs(v.t1 - v1.t1) < epsilon) === i;

const max_intersect_count = 9; // 二元3次方程最多9个解
// 有且只有一个交点? 不对。可能有两个交点
function _binarySearch(curve1: Bezier, curve2: Bezier): { t0: number, t1: number }[] {

    // 能否再快点？// 判断curve接近线条时用线段交点计算？
    // 当迭代一定层级后使用线段交点逼近？有没有可能平行？

    const box1 = curve1.bbox();
    const box2 = curve2.bbox();
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return [];

    const box1ispoint = box1.w < float_accuracy && box1.h < float_accuracy;
    const box2ispoint = box2.w < float_accuracy && box2.h < float_accuracy
    if (box1ispoint && box2ispoint) {
        if (point_eq(curve1.from, curve2.from)) {
            return [{ t0: 0, t1: 0 }]
        }
        if (point_eq(curve1.from, curve2.to)) {
            return [{ t0: 0, t1: 1 }]
        }
        if (point_eq(curve1.to, curve2.from)) {
            return [{ t0: 1, t1: 0 }]
        }
        if (point_eq(curve1.to, curve2.to)) {
            return [{ t0: 1, t1: 1 }]
        }
        return [{ t0: 0.5, t1: 0.5 }]
    }

    let c1: Bezier[]
    let t1: number[]
    let c2: Bezier[]
    let t2: number[]
    if (box1ispoint) {
        c1 = [curve1]
        t1 = [0, 1]
    } else {
        c1 = curve1.split(0.5)
        t1 = [0, 0.5, 1]
    }
    if (box2ispoint) {
        c2 = [curve2]
        t2 = [0, 1]
    } else {
        c2 = curve2.split(0.5)
        t2 = [0, 0.5, 1]
    }

    let ret: { t0: number, t1: number }[] = []
    for (let i = 0; i < c1.length; ++i) {
        const v1 = c1[i];
        for (let j = 0; j < c2.length; ++j) {
            const v2 = c2[j];
            const ret1 = _binarySearch(v1, v2);
            if (ret1.length === 0) continue;
            const t11 = t1[i]
            const t12 = t1[i + 1]
            const d1 = t12 - t11
            const t21 = t2[j]
            const t22 = t2[j + 1]
            const d2 = t22 - t21

            ret1.forEach(r => {
                ret.push({ t0: t11 + r.t0 * d1, t1: t21 + r.t1 * d2 })
            })

            if (ret.length > max_intersect_count) { // 异常终止，比如两根线非常接近又不共线时
                ret = ret.filter(accept)
                // 如果超出9个交点,考虑这两个bezier非常靠近，几乎共线
                if (ret.length > max_intersect_count) return ret; // 不会有超过9个交点的
            }
        }
    }

    return ret;
}

export function binarySearch(curve1: Bezier, curve2: Bezier): { t0: number, t1: number }[] {
    if (!intersect_rect(curve1.bbox(), curve2.bbox())) return []

    const extrema1 = curve1.extrema().filter(t => !float_eq(t, 0) && !float_eq(t, 1));
    const extrema2 = curve2.extrema().filter(t => !float_eq(t, 0) && !float_eq(t, 1));


    if (extrema1.length === 0 && extrema2.length === 0) {
        return _binarySearch(curve1, curve2).filter(accept);
    }

    let c1: Bezier[]
    let t1: number[]
    let c2: Bezier[]
    let t2: number[]

    if (extrema1.length > 0) {
        c1 = splits(curve1, extrema1)
        t1 = [0, ...extrema1, 1]
    } else {
        c1 = [curve1]
        t1 = [0, 1]
    }
    if (extrema2.length > 0) {
        c2 = splits(curve2, extrema2)
        t2 = [0, ...extrema2, 1]
    } else {
        c2 = [curve2]
        t2 = [0, 1]
    }

    const ret: { t0: number, t1: number }[] = []
    for (let i = 0, len = c1.length; i < len; ++i) {
        const v1 = c1[i];
        for (let j = 0, len = c2.length; j < len; ++j) {
            const v2 = c2[j];
            const ret1 = _binarySearch(v1, v2);
            if (ret1.length === 0) continue;

            const t11 = t1[i]
            const t12 = t1[i + 1]
            const d1 = t12 - t11
            const t21 = t2[j]
            const t22 = t2[j + 1]
            const d2 = t22 - t21

            ret1.forEach(r => {
                ret.push({ t0: t11 + r.t0 * d1, t1: t21 + r.t1 * d2 })
            })
        }
    }
    return ret.filter(accept);
}
