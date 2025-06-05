/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import { point_eq } from "./basic";
import { Path } from "./path";
import { Path1 } from "./path1";

export class PathBuilder {
    _paths: Path1[] = []

    private _newp(x: number, y: number) {
        const np = new Path1();
        np.start.x = x;
        np.start.y = y;
        this._paths.push(np)
        return np;
    }

    moveTo(x: number, y: number) {
        if (this._paths.length === 0 || this._paths[this._paths.length - 1].cmds.length > 0) {
            this._newp(x, y)
        }
    }
    lineTo(x: number, y: number) {
        if (this._paths.length === 0) throw new Error();
        let last = this._paths[this._paths.length - 1];
        if (last.isClose) {
            last = this._newp(last.start.x, last.start.y)
        }
        last.cmds.push({ type: 'L', x, y })
    }
    quadTo(x: number, y: number, x1: number, y1: number) {
        if (this._paths.length === 0) throw new Error();
        let last = this._paths[this._paths.length - 1];
        if (last.isClose) {
            last = this._newp(last.start.x, last.start.y)
        }
        last.cmds.push({ type: 'Q', x, y, x1, y1 })
    }
    cubicTo(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
        if (this._paths.length === 0) throw new Error();
        let last = this._paths[this._paths.length - 1];
        if (last.isClose) {
            last = this._newp(last.start.x, last.start.y)
        }
        last.cmds.push({ type: 'C', x, y, x1, y1, x2, y2 })
    }
    close() {
        if (this._paths.length === 0) return;

        const last = this._paths[this._paths.length - 1];
        last.isClose = true;
    }

    getPath() {
        const path = new Path();
        path._paths = this._paths.reduce((p, c) => {
            if (c.cmds.length > 0) p.push(c); // 过滤掉空路径
            return p;
        }, [] as Path1[]).map(p => {
            if (!p.isClose) {
                // fix
                const last = p.cmds[p.cmds.length - 1]
                if (point_eq(p.start, last)) p.isClose = true;
            }
            return p;
        });

        this._paths = []
        return path;
    }
}