import { OpType } from "../src/basic";
import { Path } from "../src/path";

test("add path", () => {

    const path = new Path("M0 0L100 0L100 100L0 100L0 0Z")

    const p1 = path.clone()
    p1.translate(50, 50)
    const p2 = path.clone()
    p2.translate(200, 0)
    const p3 = path.clone()
    p3.translate(250, 50)

    path.op(p1, OpType.Union)
    path.addPath(p2)
    path.op(p3, OpType.Union)

    // console.log(path.toSVGString())
    expect(path.toSVGString()).toBe("M0 0L100 0L100 50L150 50L150 150L50 150L50 100L0 100ZM200 0L300 0L300 50L350 50L350 150L250 150L250 100L200 100Z")
})