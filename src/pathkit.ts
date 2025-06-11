/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import PathKitInit from 'pathkit-wasm'
import wasmModule from 'pathkit-wasm/bin/pathkit.wasm'

enum PathKitOp {
    DIFFERENCE,
    INTERSECT,
    UNION,
    XOR,
    REVERSE_DIFFERENCE,
}
export enum Join {
    "MITER",
    "ROUND",
    "BEVEL"
}

export enum Cap {
    "BUTT",
    "ROUND",
    "SQUARE",
}

export enum FillType {
    "WINDING",
    "EVENODD",
    "INVERSE_WINDING",
    "INVERSE_EVENODD"
}

export interface StrokeOpts {
    width?: number;
    miter_limit?: number;
    res_scale?: number;
    join?: Join;
    cap?: Cap;
}

interface IKitPath {
    toSVGString(): string;
    op(path: IKitPath, op: PathKitOp): boolean;
    delete(): void;
    addPath(otherPath: IKitPath): IKitPath;
    stroke(ops?: StrokeOpts): IKitPath | null;
    setFillType(type: FillType): void;
    simplify(): IKitPath | null;
    dash(on: number, off: number, phase: number): IKitPath | null;
}

interface PathKit {
    PathOp: {
        DIFFERENCE: PathKitOp.DIFFERENCE,
        INTERSECT: PathKitOp.INTERSECT,
        UNION: PathKitOp.UNION,
        XOR: PathKitOp.XOR,
        REVERSE_DIFFERENCE: PathKitOp.REVERSE_DIFFERENCE,
    }
    FromSVGString(str: string): IKitPath
}

let _pathkit: PathKit;
export async function init() {
    if (_pathkit) return;
    const wasmBinary: ArrayBuffer = Uint8Array.from(atob(wasmModule), c => c.charCodeAt(0)).buffer;
    _pathkit = await PathKitInit({
        wasmBinary
    })
}

export function difference(path0: string, path1: string): string {
    if (!_pathkit) throw Error("Not init");
    const p0: IKitPath = _pathkit.FromSVGString(path0);
    const p1: IKitPath = _pathkit.FromSVGString(path1);
    if (p0 && p1) {
        p0.op(p1, _pathkit.PathOp.XOR)
        const path = p0.toSVGString();
        p0.delete();
        p1.delete();
        return path;
    }
    console.log("difference op failed")
    if (p0) p0.delete();
    if (p1) p1.delete();
    return "";
}
export function intersection(path0: string, path1: string): string {
    if (!_pathkit) throw Error("Not init");
    const p0: IKitPath = _pathkit.FromSVGString(path0);
    const p1: IKitPath = _pathkit.FromSVGString(path1);
    if (p0 && p1) {
        p0.op(p1, _pathkit.PathOp.INTERSECT)
        const path = p0.toSVGString();
        p0.delete();
        p1.delete();
        return path;
    }
    console.log("intersect op failed")
    if (p0) p0.delete();
    if (p1) p1.delete();
    return "";
}
export function subtract(path0: string, path1: string): string {
    if (!_pathkit) throw Error("Not init");
    const p0: IKitPath = _pathkit.FromSVGString(path0);
    const p1: IKitPath = _pathkit.FromSVGString(path1);
    if (p0 && p1) {
        p0.op(p1, _pathkit.PathOp.DIFFERENCE)
        const path = p0.toSVGString();
        p0.delete();
        p1.delete();
        return path;
    }
    console.log("subtract op failed")
    if (p0) p0.delete();
    if (p1) p1.delete();
    return "";
}
export function union(path0: string, path1: string): string {
    if (!_pathkit) throw Error("Not init");
    const p0: IKitPath = _pathkit.FromSVGString(path0);
    const p1: IKitPath = _pathkit.FromSVGString(path1);
    if (p0 && p1) {
        p0.op(p1, _pathkit.PathOp.UNION)
        const path = p0.toSVGString();
        p0.delete();
        p1.delete();
        return path;
    }
    console.log("union op failed")
    if (p0) p0.delete();
    if (p1) p1.delete();
    return "";
}
export function stroke(path: string, ops?: StrokeOpts): string | undefined {
    const p0 = _pathkit.FromSVGString(path);
    const p1 = p0.stroke(ops);
    if (!p1) {
        p0.delete()
        return;
    }
    p1.setFillType(FillType.WINDING);
    p1.simplify();
    const result = p1.toSVGString();
    p0.delete()
    return result
}

export function noneZero2evenOdd(path: string): string | undefined {
    if (!_pathkit) throw Error("Not init");
    const p0: IKitPath = _pathkit.FromSVGString(path);
    p0.setFillType(FillType.WINDING);
    const p1 = p0.simplify(); // return this
    const ret = p1?.toSVGString();
    p0.delete();
    return ret;
}

export function dash(path: string, on: number, off: number, phase: number) {
    const p0 = _pathkit.FromSVGString(path);
    const ret = p0.dash(on, off, phase)?.toSVGString();
    p0.delete();
    return ret;
}