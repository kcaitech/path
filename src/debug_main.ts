import { OpType } from "./basic";
import { Bezier3 } from "./bezier3";
import { utils } from "./bezierjs/src/utils";
import { Line } from "./line";
import { PathBuilder } from "./pathbuilder";

// vscode debug
// 需要修改tsconfig.json
// "module": "CommonJS",
// 然后以dist中的js文件启动


const builder = new PathBuilder();
builder.moveTo(50, 100)
builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
builder.close()

const path = builder.getPath();
console.log(path.toSVGString())

builder.moveTo(50, 100)
builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
builder.close()

const path1 = builder.getPath();

// 顺时针旋转45度
path1.translate(-50, -50)
const angle = Math.PI / 4;
const cos = Math.cos(angle)
const sin = Math.sin(angle)
path1.transform({
    computeCoord(x, y) {
        return { x: x * cos - y * sin, y: x * sin + y * cos }
    },
})
path1.translate(50, 50)

console.log(path1.toSVGString())

path.op(path1, OpType.Union);
console.log(path.toSVGString())


// const p1 = [
//     {
//         x: 14.64466094067263,
//         y: 85.35533905932738,
//     },
//     {
//         x: 34.153198846825276,
//         y: 104.86387696548002,
//     },
//     {
//         x: 65.84680115317474,
//         y: 104.86387696548002,
//     },
//     {
//         x: 85.35533905932738,
//         y: 85.35533905932738,
//     },
// ]
// const p2 = [
//     {
//         x: 0,
//         y: 50,
//     },
//     {
//         x: 0,
//         y: 77.58923888895069,
//     },
//     {
//         x: 22.4107611110493,
//         y: 100,
//     },
//     {
//         x: 50,
//         y: 100,
//     },
// ]
// const c1 = new Bezier3(p1[0], p1[1], p1[2], p1[3])
// const c2 = new Bezier3(p2[0], p2[1], p2[2], p2[3])

// const intersect = c1.intersect(c2);