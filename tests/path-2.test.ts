import { OpType } from "../src/basic";
import { PathBuilder } from "../src/pathbuilder";

describe(`path 2`, () => {
    test('coin union', () => {

        const builder = new PathBuilder();
        builder.moveTo(50, 100)
        builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
        builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
        builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
        builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
        builder.close()

        const path = builder.getPath();

        builder.moveTo(50, 100)
        builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
        builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
        builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
        builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
        builder.close()

        const path1 = builder.getPath();

        path.op(path1, OpType.Union)
        expect(path.toSVGString()).toBe(path1.toSVGString())
    })
})