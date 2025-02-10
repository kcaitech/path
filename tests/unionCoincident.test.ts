import { PathBuilder } from "../src/pathbuilder"
import { OpType } from "../src/basic";
describe(`unionCoincident`,()=>{
    //第一种情况:三个矩形进行联集操作后比预期情况少了两条segments
    test(`firstSituation`,()=>{
        // 此处一共由三个rect组成，其中第一段为child0,通过与两个child1组成路径
        const builder=new PathBuilder();
        builder.moveTo(50,50);
        builder.lineTo(150,50);
        builder.lineTo(150,150);
        builder.lineTo(50,150);
        builder.lineTo(50,50);
        builder.close();
        //此处的path为第一段即child0的路径
        const path = builder.getPath();
        expect(path.toSVGString()).toBe('M50 50L150 50L150 150L50 150L50 50Z');
        builder.moveTo(0,0);
        builder.lineTo(100,0);
        builder.lineTo(100,100);
        builder.lineTo(0,100);
        builder.lineTo(0,0);
        builder.close();
        //此处的path为第二段即child1的路径
        const path2=builder.getPath();
        expect(path2.toSVGString()).toBe('M0 0L100 0L100 100L0 100L0 0Z');
        //进行一次联集操作后,path和path2的路径应该与最后相同
        path.op(path2,OpType.Union);
        expect(path.toSVGString()).toBe('M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0Z');
        //此处是第二个child1,与上一个child1保持一致
        builder.moveTo(0,0);
        builder.lineTo(100,0);
        builder.lineTo(100,100);
        builder.lineTo(0,100);
        builder.lineTo(0,0);
        builder.close();
        const path3=builder.getPath();
        path.op(path3,OpType.Union);
       
        expect(path.toSVGString()).toBe('M150 50L150 150L50 150L50 100L0 100L0 0L100 0L100 50Z');
        
    })
    //第二种情况:四个矩形进行联集操作后与第一种情况相似
    //区别在于三个矩形下只有都为50%的情况下才会触发
    //四个矩形下移动中间矩形位置在一定范围内会出现第一种情况，此处取恰好中间的值
    test(`secondSituation`,()=>{
        const builder=new PathBuilder();
        builder.moveTo(50,50);
        builder.lineTo(150,50);
        builder.lineTo(150,150);
        builder.lineTo(50,150);
        builder.lineTo(50,50);
        builder.close();
        const path=builder.getPath();
        expect(path.toSVGString()).toBe('M50 50L150 50L150 150L50 150L50 50Z');
        builder.moveTo(0,0);
        builder.lineTo(100,0);
        builder.lineTo(100,100);
        builder.lineTo(0,100);
        builder.lineTo(0,0);
        builder.close();
        const path2=builder.getPath();
        path.op(path2,OpType.Union);
        builder.moveTo(-50,-50);
        builder.lineTo(50,-50);
        builder.lineTo(50,50);
        builder.lineTo(-50,50);
        builder.lineTo(-50,-50);
        builder.close();
        const path3=builder.getPath();
        path.op(path3,OpType.Union);
        builder.moveTo(50,50);
        builder.lineTo(150,50);
        builder.lineTo(150,150);
        builder.lineTo(50,150);
        builder.lineTo(50,50);
        builder.close();
        const path4=builder.getPath();
        path.op(path4,OpType.Union);
        expect(path.toSVGString()).toBe('M150 50L150 150L50 150L50 100L0 100L0 50L-50 50L-50 -50L50 -50L50 0L100 0L100 50Z');
        
        
    })
    //第三种情况:在第二种情况之下将中间的两个矩形叠加后会导致丢失
    test(`thirdSituation`,()=>{
        const builder=new PathBuilder();
        builder.moveTo(50,50);
        builder.lineTo(150,50);
        builder.lineTo(150,150);
        builder.lineTo(50,150);
        builder.lineTo(50,50);
        builder.close();
        
        const path=builder.getPath();
        
        builder.moveTo(0,0);
        builder.lineTo(100,0);
        builder.lineTo(100,100);
        builder.lineTo(0,100);
        builder.lineTo(0,0);
        builder.close();
        const path1=builder.getPath();
        path.op(path1,OpType.Union);
        builder.moveTo(0,0);
        builder.lineTo(100,0);
        builder.lineTo(100,100);
        builder.lineTo(0,100);
        builder.lineTo(0,0);
        builder.close();
        const path2=builder.getPath();
        path.op(path2,OpType.Union);
        builder.moveTo(50,50);
        builder.lineTo(150,50);
        builder.lineTo(150,150);
        builder.lineTo(50,150);
        builder.lineTo(50,50);
        
        builder.close();
        const path3=builder.getPath();
        path.op(path3,OpType.Union);
        expect(path.toSVGString()).toBe('M150 50L150 150L50 150L50 100L0 100L0 0L100 0L100 50Z');
       
    })
})