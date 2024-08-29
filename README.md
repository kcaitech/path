Bezier: 
https://pomax.github.io/bezierinfo/index.html
https://pomax.github.io/bezierjs/
https://github.com/Pomax/bezierjs

PathOp实现方案
1. 路径简化为M,L,Q,C,Z，FillType:EvenOdd
2. 以grid为查找算法
3. 路径区分enum PathType { Subject, Clip }
4. 判断路径相交，在交点处断开
5. 遍历路径
    a. difference: Subject的线段在Clip内标记删除，Clip的线段在Subject外标记删除
    b. union: Subject的线段在Clip内标记删除，Clip的线段在Subject内标记删除
    c. intersection: Subject的线段在Clip外标记删除，Clip的线段在Subject外标记删除
    d. exclude(Xor): difference(Subject, Clip) + difference(Clip, Subject)；后面不再讨论
6. 重新连接路径
    在一个顶点有多条路径时，优先选择往内拐的（最小面积），最后成了各个独立的path
    difference: 遍历完所有未删除的Subject
    union: 遍历完所有未删除的Subject和Clip
    intersection: 遍历完所有未删除的Subject或者Clip
7. 共线处理
    difference: Subject均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如同时在或者同时不在Subject和Clip中，则标记删除
    union: Subject均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中，则标记删除
    intersection: Subject均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中，则标记删除
    *同时在或者同时不在，是指填充重合的区域的边，反之则是不重合的边。即difference重合部分要去除，union和intersection重合部分要保留