/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

import { OpType } from "./basic";
// import { Bezier3 } from "./bezier3";
// import { utils } from "./bezierjs/src/utils";
// import { Line } from "./line";
import { Path } from "./path";
// import { PathBuilder } from "./pathbuilder";

// vscode debug
// 需要修改tsconfig.json
// "module": "CommonJS",
// 然后以dist中的js文件启动


// const builder = new PathBuilder();
// builder.moveTo(50, 100)
// builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
// builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
// builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
// builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
// builder.close()

// const path = builder.getPath();
// console.log(path.toSVGString())

// builder.moveTo(50, 100)
// builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
// builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
// builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
// builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
// builder.close()

// const path1 = builder.getPath();

// // 顺时针旋转45度
// path1.translate(-50, -50)
// const angle = Math.PI / 4;
// const cos = Math.cos(angle)
// const sin = Math.sin(angle)
// path1.transform({
//     computeCoord(x, y) {
//         return { x: x * cos - y * sin, y: x * sin + y * cos }
//     },
// })
// path1.translate(50, 50)

// console.log(path1.toSVGString())

// path.op(path1, OpType.Union);
// console.log(path.toSVGString())



const path0 = new Path('M0 0L200 0L200 200L0 200L0 0Z');
path0.translate(0, 50);
const path1 = new Path('M15.000482253086451 5.243059353259773e-14L15.000000000000027 0.0006976322014198569L15.000482253086451 9.466550996560111e-29L30.00000000000003 30.00069763220142L2.6645352591003757e-14 30.00069763220142L15.000482253086451 5.243059353259773e-14Z');
path1.translate(152, 20);
const path2 = new Path('M0 0L100 0L100 100L0 100L0 0Z')
path0.op(path1, OpType.Union);
console.log(path0.toSVGString(), 'path1');
// path0.op(path2, OpType.Xor);
// console.log(path0.toSVGString(), 'path2');
// path0.op(path3, OpType.Union)
// console.log(path0.toSVGString(), 'path2')
