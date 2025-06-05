# Path

@kcaitech/path is a TypeScript library for path operations, supporting Difference, Union, Intersection, and Xor operations between paths.

## Installation

You can install Path via npm:

```bash
npm install @kcaitech/path

## Example
```ts
import { Path, OpType } from '@kcaitech/path';

const path0 = new Path('M0 0L100 0L100 100L0 100L0 0Z');
const path1 = new Path('M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0L100 50Z');

// Perform union operation
path1.op(path0, OpType.Union);

// Output the SVG string of the result path
console.log(path1.toSVGString());
// Output: 'M100 50L150 50L150 150L50 150L50 100L0 100L0 0L100 0Z'
```
## API Reference
### Path
* constructor(svgString: string): Creates a new Path object from an SVG path string.

* op(other: Path, opType: OpType): Performs the specified operation (Difference, Union, Intersection, Xor) between the current path and another path.

* translate(x: number, y: number): Translates the path.

* transform(matrix: { map: (x: number, y: number) => Point }): Applies matrix transformation.

* clone(): Path: Returns a copy of the current path.

* toSVGString(): string: Returns the SVG string representation of the path.

### OpType
* Difference: Difference operation.

* Union: Union operation.

* Intersection: Intersection operation.

* Xor: Exclusive OR operation.

### TODO
The stroke feature adds stroke effects to paths. Not yet implemented. Currently using PathKit's implementation as a replacement, which requires initialization before use:

```ts
// Initialize PathKit
await Path.init();

// Create path
const path = new Path('M0 0L100 0L100 100L0 100Z');

// Add stroke
const strokePath = path.stroke({
    width: 10,
    join: 'miter',
    cap: 'butt',
    miterLimit: 4
});
```

## LICENSE
MIT
