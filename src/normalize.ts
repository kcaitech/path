/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */


// path -> curvpoint[]
// ----------------------------------------------------------------------------------

import { PathCmd, point_eq } from "./basic";
import { Path1 } from "./path1";

// ----------------------------------------------------------------------------------
// arc to bezier
const PI2 = Math.PI * 2;

function mapToEllipse(x: number, y: number, rx: number, ry: number, cosphi: number, sinphi: number, centerx: number, centery: number) {
    x *= rx;
    y *= ry;

    const xp = cosphi * x - sinphi * y;
    const yp = sinphi * x + cosphi * y;

    return {
        x: xp + centerx,
        y: yp + centery
    };
}

function approxUnitArc(ang1: number, ang2: number) {
    const a = 4 / 3 * Math.tan(ang2 / 4);

    const x1 = Math.cos(ang1);
    const y1 = Math.sin(ang1);
    const x2 = Math.cos(ang1 + ang2);
    const y2 = Math.sin(ang1 + ang2);

    return [
        {
            x: x1 - y1 * a,
            y: y1 + x1 * a
        },
        {
            x: x2 + y2 * a,
            y: y2 - x2 * a
        },
        {
            x: x2,
            y: y2
        }
    ];
}

function vectorAngle(ux: number, uy: number, vx: number, vy: number) {
    const sign = (ux * vy - uy * vx < 0) ? -1 : 1;
    const umag = Math.sqrt(ux * ux + uy * uy);
    const vmag = Math.sqrt(ux * ux + uy * uy);
    const dot = ux * vx + uy * vy;

    let div = dot / (umag * vmag);

    if (div > 1) div = 1;
    if (div < -1) div = -1;

    return sign * Math.acos(div);
}

function getArcCenter(px: number, py: number, cx: number, cy: number, rx: number, ry: number, largeArcFlag: number, sweepFlag: number, sinphi: number, cosphi: number, pxp: number, pyp: number) {
    const rxsq = Math.pow(rx, 2);
    const rysq = Math.pow(ry, 2);
    const pxpsq = Math.pow(pxp, 2);
    const pypsq = Math.pow(pyp, 2);

    let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);

    if (radicant < 0) radicant = 0;

    radicant /= (rxsq * pypsq) + (rysq * pxpsq);
    radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

    const centerxp = radicant * rx / ry * pyp;
    const centeryp = radicant * -ry / rx * pxp;

    const centerx = cosphi * centerxp - sinphi * centeryp + (px + cx) / 2;
    const centery = sinphi * centerxp + cosphi * centeryp + (py + cy) / 2;

    const vx1 = (pxp - centerxp) / rx;
    const vy1 = (pyp - centeryp) / ry;
    const vx2 = (-pxp - centerxp) / rx;
    const vy2 = (-pyp - centeryp) / ry;

    const ang1 = vectorAngle(1, 0, vx1, vy1);
    let ang2 = vectorAngle(vx1, vy1, vx2, vy2);

    if (sweepFlag === 0 && ang2 > 0) {
        ang2 -= PI2;
    }

    if (sweepFlag === 1 && ang2 < 0) {
        ang2 += PI2;
    }

    return [centerx, centery, ang1, ang2];
}
// credit to https://github.com/colinmeinke/svg-arc-to-cubic-bezier
function arcToBezier(lastPoint: { x: number, y: number }, arcParams: number[]) {
    const px = lastPoint.x; // prevX
    const py = lastPoint.y; // prevY
    const cx = arcParams[5]; // currX
    const cy = arcParams[6]; // currY
    let rx = arcParams[0];
    let ry = arcParams[1];
    const xAxisRotation = arcParams[2];
    const largeArcFlag = arcParams[3];
    const sweepFlag = arcParams[4];

    const curves = [];

    if (rx === 0 || ry === 0) {
        return null;
    }

    const sinphi = Math.sin(xAxisRotation * Math.PI / 180);
    const cosphi = Math.cos(xAxisRotation * Math.PI / 180);

    const pxp = cosphi * (px - cx) / 2 + sinphi * (py - cy) / 2;
    const pyp = -sinphi * (px - cx) / 2 + cosphi * (py - cy) / 2;

    if (pxp === 0 && pyp === 0) return null;

    const lambda = Math.pow(pxp, 2) / Math.pow(rx, 2) + Math.pow(pyp, 2) / Math.pow(ry, 2);
    if (lambda > 1) {
        rx *= Math.sqrt(lambda);
        ry *= Math.sqrt(lambda);
    }

    const arcCenter = getArcCenter(px, py, cx, cy, rx, ry, largeArcFlag, sweepFlag, sinphi, cosphi, pxp, pyp);
    const centerx = arcCenter[0];
    const centery = arcCenter[1];
    let ang1 = arcCenter[2];
    let ang2 = arcCenter[3];

    const segments = Math.max(Math.ceil(Math.abs(ang2) / (PI2 / 4)), 1);

    ang2 /= segments;

    for (let i = 0; i < segments; i++) {
        curves.push(approxUnitArc(ang1, ang2));
        ang1 += ang2;
    }

    return curves.map(function (curve) {
        const m1 = mapToEllipse(curve[0].x, curve[0].y, rx, ry, cosphi, sinphi, centerx, centery);
        const m2 = mapToEllipse(curve[1].x, curve[1].y, rx, ry, cosphi, sinphi, centerx, centery);
        const m = mapToEllipse(curve[2].x, curve[2].y, rx, ry, cosphi, sinphi, centerx, centery);

        return [m1.x, m1.y, m2.x, m2.y, m.x, m.y];
    });
}



// // 将路径中的相对值转换为绝对坐标

type CmdType = PathCmd |
{ type: "M", x: number, y: number } |
{ type: "Z" }

type CurvCtx = {
    segs: Path1[], // 初始化时至少给一个
    lastCommand: CmdType,
    prepoint: { x: number, y: number }
}

const normalHandler: { [key: string]: (ctx: CurvCtx, item: any[]) => void } = {}

export class Normalizer {
    ctx: CurvCtx = {
        segs: [],
        lastCommand: { type: "Z" },
        prepoint: { x: 0, y: 0 }
    }
    add(item: (number | string)[]) {
        normalHandler[item[0]](this.ctx, item)
    }
    getPaths() {
        return this.ctx.segs.reduce((p, c) => {
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
    }
}

function preparePath(ctx: CurvCtx, x: number, y: number) {
    if (!ctx.segs[ctx.segs.length - 1]) { // 没有m,浏览器不显示
        const path = new Path1();
        ctx.segs.push(path);
        path.start.x = x;
        path.start.y = y;
        return path;
    }
    const path = ctx.segs[ctx.segs.length - 1]
    if (path.isClose) {
        const path1 = new Path1();
        ctx.segs.push(path1);
        path1.start.x = ctx.prepoint.x;
        path1.start.y = ctx.prepoint.y;
        return path1;
    }
    return path;
}

normalHandler['M'] = (ctx: CurvCtx, item: any[]) => {
    const x = item[1];
    const y = item[2];

    // 新path
    const path = new Path1();
    ctx.segs.push(path);
    path.start.x = x;
    path.start.y = y;
    ctx.lastCommand = { type: "M", x, y }
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['m'] = (ctx: CurvCtx, item: any[]) => {
    const path = new Path1();
    ctx.segs.push(path);
    const x = (ctx.prepoint.x) + item[1];
    const y = (ctx.prepoint.y) + item[2];
    path.start.x = x;
    path.start.y = y;
    ctx.lastCommand = { type: "M", x, y }
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}

normalHandler['L'] = (ctx: CurvCtx, item: any[]) => {
    const x: number = item[1];
    const y: number = item[2];
    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['l'] = (ctx: CurvCtx, item: any[]) => {
    const x = ctx.prepoint.x + item[1];
    const y = ctx.prepoint.y + item[2];
    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}

normalHandler['A'] = (ctx: CurvCtx, item: any[]) => {
    // (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
    // const seg = ctx.segs[ctx.segs.length - 1];
    // const x = item[6];
    // const y = item[7];
    const curves = arcToBezier(ctx.prepoint, item.slice(1))
    if (curves) for (let i = 0, len = curves.length; i < len; i++) {
        // C x1 y1, x2 y2, x y
        item = ['C', ...curves[i]]
        const x = item[5];
        const y = item[6];
        const x1 = item[1];
        const y1 = item[2];
        const x2 = item[3];
        const y2 = item[4];
        // curveHandleBezier(seg, x1, y1, x2, y2, x, y);

        const path = preparePath(ctx, x, y);
        ctx.lastCommand = { type: "C", x1, y1, x2, y2, x, y }
        path.cmds.push(ctx.lastCommand)
        ctx.prepoint.x = x;
        ctx.prepoint.y = y;
    }
}
normalHandler['a'] = (ctx: CurvCtx, item: any[]) => {
    // (rx ry x-axis-rotation large-arc-flag sweep-flag dx dy)
    // const seg = ctx.segs[ctx.segs.length - 1];
    const x = ctx.prepoint.x + item[6];
    const y = ctx.prepoint.y + item[7];
    item = item.slice(0);
    item[0] = 'A';
    item[6] = x;
    item[7] = y;
    normalHandler['A'](ctx, item)
}

normalHandler['H'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    const x = item[1];
    const y = ctx.prepoint.y;

    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['h'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    const x = ctx.prepoint.x + item[1];
    const y = ctx.prepoint.y;

    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['V'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    const x = ctx.prepoint.x;
    const y = item[1];

    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['v'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    const x = ctx.prepoint.x;
    const y = ctx.prepoint.y + item[1];

    const path = preparePath(ctx, x, y)
    ctx.lastCommand = { type: "L", x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
// 三次贝塞尔曲线
normalHandler['C'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    // C x1 y1, x2 y2, x y
    const x = item[5];
    const y = item[6];
    const x1 = item[1];
    const y1 = item[2];
    const x2 = item[3];
    const y2 = item[4];

    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "C", x1, y1, x2, y2, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['c'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    // c dx1 dy1, dx2 dy2, dx dy
    const x = ctx.prepoint.x + item[5];
    const y = ctx.prepoint.y + item[6];
    const x1 = ctx.prepoint.x + item[1];
    const y1 = ctx.prepoint.y + item[2];
    const x2 = ctx.prepoint.x + item[3];
    const y2 = ctx.prepoint.y + item[4];

    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "C", x1, y1, x2, y2, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
// 平滑三次贝塞尔曲线
normalHandler['S'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    let x1, y1, x2, y2, x, y;
    if (ctx.lastCommand.type === 'C') { // 延续三次贝塞尔曲线
        x1 = 2 * ctx.prepoint.x - ctx.lastCommand.x2;
        y1 = 2 * ctx.prepoint.y - ctx.lastCommand.y2;

        x2 = item[1];
        y2 = item[2];

        x = item[3];
        y = item[4];

        // curveHandleBezier(seg, x1, y1, x2, y2, x, y);
    } else { // 没有可以延续的指令，以二次贝塞尔曲线的效果转成三次贝塞尔曲线
        x1 = item[1];
        y1 = item[2];

        x2 = item[1];
        y2 = item[2];

        x = item[3];
        y = item[4];

        // curveHandleQuaBezier(seg, x1, y1, x, y);
    }

    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "C", x1, y1, x2, y2, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}
normalHandler['s'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    let x1, y1, x2, y2, x, y;
    if (ctx.lastCommand.type === 'C') {
        x1 = 2 * ctx.prepoint.x - ctx.lastCommand.x2;
        y1 = 2 * ctx.prepoint.y - ctx.lastCommand.y2;

        x2 = ctx.prepoint.x + item[1];
        y2 = ctx.prepoint.y + item[2];

        x = ctx.prepoint.x + item[3];
        y = ctx.prepoint.y + item[4];

        // curveHandleBezier(seg, x1, y1, x2, y2, x, y);
    } else {
        x1 = ctx.prepoint.x + item[1];
        y1 = ctx.prepoint.y + item[2];

        x2 = x1;
        y2 = y1;

        x = ctx.prepoint.x + item[3];
        y = ctx.prepoint.y + item[4];

        // curveHandleQuaBezier(seg, ex, ey, x, y);
    }

    // item[0] = 'C';
    // seg.lastCommand = 'C';
    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "C", x1, y1, x2, y2, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}

// 二次贝塞尔曲线
normalHandler['Q'] = (ctx: CurvCtx, item: any[]) => {
    const seg = ctx.segs[ctx.segs.length - 1];
    // C x1 y1, x2 y2, x y
    const x = item[3];
    const y = item[4];
    const x1 = item[1];
    const y1 = item[2];
    // const x2 = x1;
    // const y2 = y1;
    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "Q", x1, y1, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}

normalHandler['q'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];

    const x = ctx.prepoint.x + item[3];
    const y = ctx.prepoint.y + item[4];
    const x1 = ctx.prepoint.x + item[1];
    const y1 = ctx.prepoint.y + item[2];

    // const x2 = x1;
    // const y2 = y1;
    const path = preparePath(ctx, x, y);
    ctx.lastCommand = { type: "Q", x1, y1, x, y }
    path.cmds.push(ctx.lastCommand)
    ctx.prepoint.x = x;
    ctx.prepoint.y = y;
}

// 平滑二次贝塞尔曲线
normalHandler['T'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    if (ctx.lastCommand.type === 'C') {
        const x1 = 2 * ctx.prepoint.x - ctx.lastCommand.x2;
        const y1 = 2 * ctx.prepoint.y - ctx.lastCommand.y2;

        const x = item[1];
        const y = item[2];

        // curveHandleQuaBezier(seg, x, y, tx, ty);

        // item[0] = 'C';
        // seg.lastCommand = 'C';

        // const x2 = x1;
        // const y2 = y1;
        const path = preparePath(ctx, x, y);
        ctx.lastCommand = { type: "Q", x1, y1, x, y }
        path.cmds.push(ctx.lastCommand)
        ctx.prepoint.x = x;
        ctx.prepoint.y = y;
    } else {
        const x = item[1];
        const y = item[2];

        const path = preparePath(ctx, x, y)
        ctx.lastCommand = { type: "L", x, y }
        path.cmds.push(ctx.lastCommand)
        ctx.prepoint.x = x;
        ctx.prepoint.y = y;
    }
}
normalHandler['t'] = (ctx: CurvCtx, item: any[]) => {
    // const seg = ctx.segs[ctx.segs.length - 1];
    if (ctx.lastCommand.type === 'C') {
        const x1 = 2 * ctx.prepoint.x - ctx.lastCommand.x2;
        const y1 = 2 * ctx.prepoint.y - ctx.lastCommand.y2;

        const x = ctx.prepoint.x + item[1];
        const y = ctx.prepoint.y + item[2];

        // const x2 = x1;
        // const y2 = y1;
        const path = preparePath(ctx, x, y);
        ctx.lastCommand = { type: "Q", x1, y1, x, y }
        path.cmds.push(ctx.lastCommand)
        ctx.prepoint.x = x;
        ctx.prepoint.y = y;
    } else {
        const x = ctx.prepoint.x + item[1];
        const y = ctx.prepoint.y + item[2];

        const path = preparePath(ctx, x, y)
        ctx.lastCommand = { type: "L", x, y }
        path.cmds.push(ctx.lastCommand)
        ctx.prepoint.x = x;
        ctx.prepoint.y = y;
    }
}

normalHandler['Z'] = (ctx: CurvCtx, item: any[]) => {

    ctx.lastCommand = { type: "Z" };
    if (ctx.segs.length > 0) {
        const path = ctx.segs[ctx.segs.length - 1]
        path.isClose = true;

        ctx.prepoint.x = path.start.x;
        ctx.prepoint.y = path.start.y;
    }

}
normalHandler['z'] = (ctx: CurvCtx, item: any[]) => {

    ctx.lastCommand = { type: "Z" };

    if (ctx.segs.length > 0) {
        const path = ctx.segs[ctx.segs.length - 1]
        path.isClose = true;

        ctx.prepoint.x = path.start.x;
        ctx.prepoint.y = path.start.y;
    }
}