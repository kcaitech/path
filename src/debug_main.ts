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





const oval1 = new Path('M50 100C77.58923888895069 100 100 77.58923888895069 100 50C100 22.4107611110493 77.58923888895069 0 50 0C22.4107611110493 0 0 22.4107611110493 0 50C0 77.58923888895069 22.4107611110493 100 50 100Z');
const oval2 = oval1.clone();
const oval3 = oval1.clone();
const oval4 = oval1.clone();
// const rect1 = new Path('M0 0L100 0L100 100L0 100L0 0Z');
oval1.translate(72, 31);
oval2.translate(87, 63);
oval3.translate(28, 54);
oval4.translate(48, 121);
// rect1.translate(160, 121);
oval1.op(oval2, OpType.Union)
// console.log(oval1.toSVGString())
oval1.op(oval3, OpType.Union)
// console.log(oval1.toSVGString())
oval1.op(oval4, OpType.Union)
console.log(oval1.toSVGString())
// oval1.op(rect1, OpType.Union)
// console.log(oval1.toSVGString())


const union = new Path('M122 31C104.33670926778383 31 88.7960075505586 40.185872256687865 79.89997774898919 54.03553386939869C79.26954590224264 54.0119150434853 78.63614956183984 54 78 54C50.4107611110493 54 28 76.4107611110493 28 104C28 131.5892388889507 50.4107611110493 154 78 154C86.47628247173076 154 94.463762329333 151.8846218743204 101.46270438427898 148.15360081148899C110.52881563928267 157.31786200562618 123.10791906432802 163 137 163C164.5892388889507 163 187 140.5892388889507 187 113C187 98.95769601084292 181.19430912780803 86.25691902373791 171.85508669793938 77.16982835320024C169.89523135832727 51.36617919003886 148.30063273721385 31 122 31Z')
union.op(oval4, OpType.Union)
// console.log(union.toSVGString())