import { OpType } from "./basic";
import { Bezier3 } from "./bezier3";
import { utils } from "./bezierjs/src/utils";
import { Line } from "./line";
import { Path } from "./path";
import { PathBuilder } from "./pathbuilder";

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



// const path0 = new Path('M151 93L146 87L156 87L151 93Z')
// const path1 = new Path('M170 0L1.9999999999999716 0C0.8954305003383922 0 -2.842170943040401e-14 0.8954305003384138 -2.842170943040401e-14 2.0000000000000004L-2.842170943040401e-14 85.00000000000058C-2.842170943040401e-14 86.10456949966218 0.8954305003383922 87.00000000000058 1.9999999999999716 87.00000000000058L170 87.00000000000058C171.10456949966158 87.00000000000058 172 86.10456949966218 172 85.00000000000058L172 2.0000000000000004C172 0.8954305003384138 171.10456949966158 0 170 0Z')
// path0.op(path1, OpType.Union)

