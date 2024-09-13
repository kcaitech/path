import { OpType } from "./basic";
import { Bezier3 } from "./bezier3";
import { utils } from "./bezierjs/src/utils";
import { Line } from "./line";
import { PathBuilder } from "./pathbuilder";

// vscode debug
// 需要修改tsconfig.json
// "module": "CommonJS",


// const builder = new PathBuilder();
// builder.moveTo(50, 100)
// builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
// builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
// builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
// builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
// builder.close()
// builder.moveTo(50.5, 88)
// builder.cubicTo(88, 50.5, 71.19192916671302, 88, 88, 71.19192916671302)
// builder.cubicTo(50.5, 13, 88, 29.808070833286973, 71.19192916671302, 13)
// builder.cubicTo(13, 50.5, 29.808070833286973, 13, 13, 29.808070833286973)
// builder.cubicTo(50.5, 88, 13, 71.19192916671302, 29.808070833286973, 88)
// builder.close()
// const path = builder.getPath();

// builder.moveTo(81, 96)
// builder.cubicTo(96, 81, 89.2767716666852, 96, 96, 89.2767716666852)
// builder.cubicTo(81, 66, 96, 72.7232283333148, 89.2767716666852, 66)
// builder.cubicTo(66, 81, 72.7232283333148, 66, 66, 72.7232283333148)
// builder.cubicTo(81, 96, 66, 89.2767716666852, 72.7232283333148, 96)
// builder.close()

// const path1 = builder.getPath();
// path.op(path1, OpType.Difference);
// console.log(path.toSVGString())


const p1 = [
    { x: 96, y: 81, },
    { x: 96, y: 72.7232283333148, },
    { x: 89.2767716666852, y: 66, },
    { x: 81, y: 66, },
]
const p2 = [
    { x: 50, y: 100, },
    { x: 77.58923888895069, y: 100, },
    { x: 100, y: 77.58923888895069, },
    { x: 100, y: 50, },
]
const c1 = new Bezier3(p1[0], p1[1], p1[2], p1[3])
const c2 = new Bezier3(p2[0], p2[1], p2[2], p2[3])

const intersect = c1.intersect(c2);

// expect(intersect.length).toBe(1)
// expect(intersect[0].type).toBe('intersect')
// expect(float_eq(intersect[0].t0, 0.3524198532104492)).toBe(true)
// expect(float_eq(intersect[0].t1, 0.09022116661071777)).toBe(true)

const { t0, t1 } = intersect[0];
const pc1 = c1.pointAt(t0);
const pc2 = c2.pointAt(t1);

console.log(pc1, pc2)
// expect(point_eq(pc1, pc2)).toBe(true);