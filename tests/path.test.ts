import { OpType } from "../src/basic";
import { PathBuilder } from "../src/pathbuilder"

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

        expect(path.toSVGString()).toBe('M0 0L100 0L100 25L25 25L25 100L0 100Z')
    })

    test('op union', () => {
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

        path.op(path1, OpType.Union);

        expect(path.toSVGString()).toBe('M0 0L100 0L100 25L125 25L125 125L25 125L25 100L0 100Z')
    })

    test('op intersection', () => {
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

        path.op(path1, OpType.Intersection);

        expect(path.toSVGString()).toBe('M100 25L100 100L25 100L25 25Z')
    })

    test('op', () => {
        // M50 100C77.58923888895069 100 100 77.58923888895069 100 50C100 22.4107611110493 77.58923888895069 0 50 0C22.4107611110493 0 0 22.4107611110493 0 50C0 77.58923888895069 22.4107611110493 100 50 100Z
        // M37.5 75C58.191929166713024 75 75 58.191929166713024 75 37.5C75 16.808070833286973 58.191929166713024 0 37.5 0C16.808070833286973 0 0 16.808070833286973 0 37.5C0 58.191929166713024 16.808070833286973 75 37.5 75Z

        const builder = new PathBuilder();
        builder.moveTo(50, 100)
        builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
        builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
        builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
        builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
        builder.close()
        const path = builder.getPath();
        const p1str = 'M50 100C77.58923888895069 100 100 77.58923888895069 100 50C100 22.4107611110493 77.58923888895069 0 50 0C22.4107611110493 0 0 22.4107611110493 0 50C0 77.58923888895069 22.4107611110493 100 50 100Z'
        expect(path.toSVGString()).toBe(p1str);

        builder.moveTo(50.5, 88)
        builder.cubicTo(88, 50.5, 71.19192916671302, 88, 88, 71.19192916671302)
        builder.cubicTo(50.5, 13, 88, 29.808070833286973, 71.19192916671302, 13)
        builder.cubicTo(13, 50.5, 29.808070833286973, 13, 13, 29.808070833286973)
        builder.cubicTo(50.5, 88, 13, 71.19192916671302, 29.808070833286973, 88)
        builder.close()
        const path1 = builder.getPath();
        const p2str = 'M50.5 88C71.19192916671302 88 88 71.19192916671302 88 50.5C88 29.808070833286973 71.19192916671302 13 50.5 13C29.808070833286973 13 13 29.808070833286973 13 50.5C13 71.19192916671302 29.808070833286973 88 50.5 88Z'
        expect(path1.toSVGString()).toBe(p2str)

        path.op(path1, OpType.Difference);
        expect(path.toSVGString()).toBe(p1str + p2str);
    })


    test('op 2', () => {
        const builder = new PathBuilder();
        builder.moveTo(50, 100)
        builder.cubicTo(100, 50, 77.58923888895069, 100, 100, 77.58923888895069)
        builder.cubicTo(50, 0, 100, 22.4107611110493, 77.58923888895069, 0)
        builder.cubicTo(0, 50, 22.4107611110493, 0, 0, 22.4107611110493)
        builder.cubicTo(50, 100, 0, 77.58923888895069, 22.4107611110493, 100)
        builder.close()
        builder.moveTo(50.5, 88)
        builder.cubicTo(88, 50.5, 71.19192916671302, 88, 88, 71.19192916671302)
        builder.cubicTo(50.5, 13, 88, 29.808070833286973, 71.19192916671302, 13)
        builder.cubicTo(13, 50.5, 29.808070833286973, 13, 13, 29.808070833286973)
        builder.cubicTo(50.5, 88, 13, 71.19192916671302, 29.808070833286973, 88)
        builder.close()
        const path = builder.getPath();

        builder.moveTo(81, 96)
        builder.cubicTo(96, 81, 89.2767716666852, 96, 96, 89.2767716666852)
        builder.cubicTo(81, 66, 96, 72.7232283333148, 89.2767716666852, 66)
        builder.cubicTo(66, 81, 72.7232283333148, 66, 66, 72.7232283333148)
        builder.cubicTo(81, 96, 66, 89.2767716666852, 72.7232283333148, 96)
        builder.close()

        const path1 = builder.getPath();
        path.op(path1, OpType.Difference);
        console.log(path.toSVGString())
    })
})