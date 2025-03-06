Bezier: </br>
https://pomax.github.io/bezierinfo/index.html</br>
https://pomax.github.io/bezierjs/</br>
https://github.com/Pomax/bezierjs</br>
</br>
PathOp实现方案</br>
1. 路径简化为M,L,Q,C,Z，FillType:EvenOdd</br>
2. 以grid为查找算法</br>
3. 路径区分enum PathType { Subject, Clip }</br>
4. 判断路径相交，在交点处断开</br>
5. 遍历路径</br>
    a. difference: Subject的线段在Clip内标记删除，Clip的线段在Subject外标记删除</br>
    b. union: Subject的线段在Clip内标记删除，Clip的线段在Subject内标记删除</br>
    c. intersection: Subject的线段在Clip外标记删除，Clip的线段在Subject外标记删除</br>
    d. exclude(Xor): difference(Subject, Clip) + difference(Clip, Subject)；</br>
6. 重新连接路径</br>
    在一个顶点有多条路径时，优先选择往内拐的（最小面积），最后成了各个独立的path</br>
    difference: 遍历完所有未删除的Subject</br>
    union: 遍历完所有未删除的Subject和Clip</br>
    intersection: 遍历完所有未删除的Subject或者Clip</br>
7. 共线处理</br>
    difference: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如同时在或者同时不在Subject和Clip中(可排除当前线段进行判断)，则标记删除</br>
    union: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中(可排除当前线段进行判断)，则标记删除</br>
    intersection: Clip均标记删除；Subject的线段，以此线段中一点作一射线，判断此点如【不】同时在Subject和Clip中(可排除当前线段进行判断)，则标记删除</br>
    *同时在或者同时不在，是指填充重合的区域的边，反之则是不重合的边。即difference重合部分要去除，union和intersection重合部分要保留</br>