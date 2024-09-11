import { OpType } from "./basic";
import { PathBuilder } from "./path";

// vscode debug
// 需要修改tsconfig.json
// "module": "CommonJS",

// test
function main() {
    // console.log("hello")
    const builder = new PathBuilder();
    builder.moveTo(0, 0);
    builder.lineTo(100, 0);
    builder.lineTo(100, 100);
    builder.lineTo(0, 100);
    builder.close();
    const path = builder.getPath();

    builder.moveTo(25, 25);
    builder.lineTo(125, 25);
    builder.lineTo(125, 125);
    builder.lineTo(25, 125);
    builder.close();

    const path1 = builder.getPath();

    path.op(path1, OpType.Difference);

    console.log(path.toSVGString())
}

main()