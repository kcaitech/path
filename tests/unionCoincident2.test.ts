/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

import { PathBuilder } from "../src/pathbuilder"
import { OpType } from "../src/basic";
describe(`unionCoincident`, () => {

    test(`example1`, () => {

        const builder = new PathBuilder();
        builder.moveTo(0, 50);
        builder.lineTo(100, 50);
        builder.lineTo(100, 150);
        builder.lineTo(0, 150);
        builder.lineTo(0, 50);
        builder.close();
        const path = builder.getPath();

        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();

        const path2 = builder.getPath();

        path.op(path2, OpType.Union);

        builder.moveTo(200, 100);
        builder.lineTo(300, 100);
        builder.lineTo(300, 200);
        builder.lineTo(200, 200);
        builder.lineTo(200, 100);
        builder.close();
        const path3 = builder.getPath();
        path.op(path3, OpType.Union);

        builder.moveTo(100, 50);
        builder.lineTo(200, 50);
        builder.lineTo(200, 150);
        builder.lineTo(100, 150);
        builder.lineTo(100, 50);
        builder.close();
        const path4 = builder.getPath();
        path.op(path4, OpType.Union);
        expect(path.toSVGString()).toBe('M100 150L0 150L0 50L0 0L100 0L100 50L200 50L200 100L300 100L300 200L200 200L200 150Z');

    })
    test(`example2`, () => {
        const builder = new PathBuilder();

        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path = builder.getPath();
        builder.moveTo(200, 50);
        builder.lineTo(300, 50);
        builder.lineTo(300, 150);
        builder.lineTo(200, 150);
        builder.lineTo(200, 50);
        builder.close();
        const path2 = builder.getPath();
        path.op(path2, OpType.Union);
        builder.moveTo(100, 0);
        builder.lineTo(200, 0);
        builder.lineTo(200, 100);
        builder.lineTo(100, 100);
        builder.lineTo(100, 0);
        builder.close();
        const path3 = builder.getPath();
        path.op(path3, OpType.Union);
        expect(path.toSVGString()).toBe('M0 0L100 0L200 0L200 50L300 50L300 150L200 150L200 100L100 100L0 100Z');
    })
    test(`example3`, () => {
        const builder = new PathBuilder();
        builder.moveTo(100, 50);
        builder.lineTo(171, 50);
        builder.lineTo(171, 100);
        builder.lineTo(100, 100);
        builder.lineTo(100, 50);
        builder.close();
        const path = builder.getPath();
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path2 = builder.getPath();
        path.op(path2, OpType.Union);
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path3 = builder.getPath();
        path.op(path3, OpType.Union);
        expect(path.toSVGString()).toBe('M100 50L171 50L171 100L100 100L0 100L0 0L100 0Z');
    })
    test(`example4`, () => {
        const builder = new PathBuilder();
        builder.moveTo(111, 366);
        builder.lineTo(333, 366);
        builder.lineTo(333, 565);
        builder.lineTo(111, 565);
        builder.lineTo(111, 366);
        builder.close();
        const path = builder.getPath();
        builder.moveTo(0, 597);
        builder.lineTo(222, 597);
        builder.lineTo(222, 796);
        builder.lineTo(0, 796);
        builder.lineTo(0, 597);
        builder.close();
        const path2 = builder.getPath();
        path.op(path2, OpType.Union);
        builder.moveTo(111, 796);
        builder.lineTo(333, 796);
        builder.lineTo(333, 995);
        builder.lineTo(111, 995);
        builder.lineTo(111, 796);
        builder.close();

        const path3 = builder.getPath();
        path.op(path3, OpType.Union);
        builder.moveTo(111, 199);
        builder.lineTo(333, 199);
        builder.lineTo(333, 398);
        builder.lineTo(111, 398);
        builder.lineTo(111, 199);
        builder.close();

        const path4 = builder.getPath();
        path.op(path4, OpType.Union);
        builder.moveTo(111, 0);
        builder.lineTo(333, 0);
        builder.lineTo(333, 199);
        builder.lineTo(111, 199);
        builder.lineTo(111, 0);

        const path5 = builder.getPath();
        path.op(path5, OpType.Union);
        expect(path.toSVGString()).toBe('M333 366L333 565L111 565L111 366L111 199L111 0L333 0L333 199ZM333 796L333 995L111 995L111 796L0 796L0 597L222 597L222 796Z');
    })
    test(`example5`, () => {
        const builder = new PathBuilder();
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path = builder.getPath();
        builder.moveTo(100, 100);
        builder.lineTo(200, 100);
        builder.lineTo(200, 200);
        builder.lineTo(100, 200);
        builder.lineTo(100, 100);
        builder.close();
        const path2 = builder.getPath();
        path.op(path2, OpType.Union);
        builder.moveTo(100, 0);
        builder.lineTo(200, 0);
        builder.lineTo(200, 100);
        builder.lineTo(100, 100);
        builder.lineTo(100, 0);
        builder.close();
        const path3 = builder.getPath();
        path.op(path3, OpType.Union);
        builder.moveTo(50, 50);
        builder.lineTo(150, 50);
        builder.lineTo(150, 150);
        builder.lineTo(50, 150);
        builder.lineTo(50, 50);
        builder.close();
        const path4 = builder.getPath();
        path.op(path4, OpType.Union);
        builder.moveTo(0, 100);
        builder.lineTo(100, 100);
        builder.lineTo(100, 200);
        builder.lineTo(0, 200);
        builder.lineTo(0, 100);
        builder.close();
        const path5 = builder.getPath();
        path.op(path5, OpType.Union);
        expect(path.toSVGString()).toBe('M0 0L100 0L200 0L200 100L200 200L100 200L0 200L0 100Z');
    })
    test(`example6`,()=>{
        const builder = new PathBuilder();
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path = builder.getPath();
        builder.moveTo(14, 91);
        builder.lineTo(114, 91);
        builder.lineTo(114, 191);
        builder.lineTo(14, 191);
        builder.lineTo(14, 91);
        builder.close();
        const path2 = builder.getPath();
        path.op(path2, OpType.Union);
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path3 = builder.getPath();
        path.op(path3, OpType.Union);
        expect(path.toSVGString()).toBe('M0 0L100 0L100 91L114 91L114 191L14 191L14 100L0 100Z');
    })
    test(`example7`,()=>{
        const builder = new PathBuilder();
        builder.moveTo(0, 0);
        builder.lineTo(100, 0);
        builder.lineTo(100, 100);
        builder.lineTo(0, 100);
        builder.lineTo(0, 0);
        builder.close();
        const path=builder.getPath();
        
        builder.moveTo(150, 50);
        builder.lineTo(250, 50);
        builder.lineTo(250, 150);
        builder.lineTo(150, 150);
        builder.lineTo(150, 50);
        builder.close();
        const path2=builder.getPath();
        path.op(path2,OpType.Union);
        builder.moveTo(250,50);
        builder.lineTo(350,50);
        builder.lineTo(350,150);
        builder.lineTo(250,150);
        builder.lineTo(250,50);
        builder.close();
        const path3=builder.getPath();
        path.op(path3,OpType.Union);
        builder.moveTo(100,0);
        builder.lineTo(200,0);
        builder.lineTo(200,100);
        builder.lineTo(100,100);
        builder.lineTo(100,0);
        builder.close();
        const path4=builder.getPath();
        path.op(path4,OpType.Union);
        expect(path.toSVGString()).toBe('M0 0L100 0L200 0L200 50L250 50L350 50L350 150L250 150L150 150L150 100L100 100L0 100Z');
    })
})