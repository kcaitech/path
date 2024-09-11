import { OpType } from "../src/basic";
import { PathBuilder } from "../src/path"

describe(`path`, () => {
    test('build', () => {
        const builder = new PathBuilder();
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.close();
        const path = builder.getPath();
        const str = path.toSVGString();
        expect(str).toBe('M0 0L100 0L100 100L0 100Z')
    })
    test('op difference', () => {
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
    })
})