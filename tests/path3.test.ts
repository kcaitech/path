import { OpType } from "../src/basic";
import { Path } from "../src/path";

test("path union", () => {

    const path0 = new Path('M0 0L100 0L100 100L0 100L0 0Z');
    const path1 = new Path('M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0L100 50Z');
    path1.op(path0, OpType.Union);
    // M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0Z

    // console.log(path1.toSVGString(), 'path1');
    expect(path1.toSVGString()).toBe('M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0Z')
})