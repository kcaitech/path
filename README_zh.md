# Path

@kcaitech/path 是一个用于处理路径操作的 TypeScript 库，支持路径的 Difference（差集）、Union（并集）、Intersection（交集）、Xor（异或）操作。

## 安装

你可以通过 npm 安装 Path：

```bash
npm install @kcaitech/path
```

## 示例
```ts
import { Path, OpType } from '@kcaitech/path';

const path0 = new Path('M0 0L100 0L100 100L0 100L0 0Z');
const path1 = new Path('M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0L100 50Z');

// 执行并集操作
path1.op(path0, OpType.Union);

// 输出结果路径的 SVG 字符串
console.log(path1.toSVGString());
// 输出: 'M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0Z'
```
## API 参考
### Path
* constructor(svgString: string): 通过 SVG 路径字符串创建一个新的 Path 对象。

* op(other: Path, opType: OpType): 对当前路径和另一个路径执行指定的操作（Difference、Union、Intersection、Xor）。

* translate(x: number, y: number): 平移路径。

* transform(matrix: { map: (x: number, y: number) => Point }): 应用矩阵变换。

* clone(): Path: 返回当前路径的拷贝。

* toSVGString(): string: 返回路径的 SVG 字符串表示。

### OpType
* Difference: 差集操作。

* Union: 并集操作。

* Intersection: 交集操作。

* Xor: 异或操作。

### TODO
stroke 功能用于给路径添加描边效果。还未实现。暂时使用PathKit的实现替换，使用前需要先初始化：

```ts
// 初始化 PathKit
await Path.init();

// 创建路径
const path = new Path('M0 0L100 0L100 100L0 100Z');

// 添加描边
const strokePath = path.stroke({
    width: 10,
    join: 'miter', 
    cap: 'butt',
    miterLimit: 4
});
```

## LICENSE
MIT
