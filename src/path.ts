import { Bezier } from "./bezier";
import { Grid } from "./grid";
import { Line } from "./line";
import { Point, Rect } from "./basic";

type PathCmd =
    { type: "L", x: number, y: number } |
    { type: "Q", x: number, y: number, x1: number, y1: number } |
    { type: "C", x: number, y: number, x1: number, y1: number, x2: number, y2: number }

enum PathType { Subject, Clip }

class PathA {
    start: Point = { x: 0, y: 0 }
    isClose: boolean = false
    cmds: PathCmd[] = []
    // type: PathType = PathType.Subject
}

enum OpType { Difference, Union, Intersection, Xor }


export class Path {

    _paths: PathA[] = []

    _grid?: Grid<{ bbox(): Rect }> // for path op

    addPath(path: Path) {
        this._paths.push(...path._paths);
        // update grid
        // if (this._grid) {
        //     // todo
        // }
    }

    op(path: Path, type: OpType) {

    }

    clone() {

    }

    toSVGString() {

    }

}