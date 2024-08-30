import { Point } from "./types"


class Bezier {
    points: Point[]
    discrete?: Point[]
    d: number = 0

    constructor(p0: Point, p1: Point, p2: Point)
    constructor(p0: Point, p1: Point, p2: Point, p3: Point)
    constructor(...points: Point[]) {
        this.points = points
    }


}


export class Bezier2 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point) {
        super(p0, p1, p2)
    }

    get type() {
        return "Q"
    }
}


export class Bezier3 extends Bezier {

    constructor(p0: Point, p1: Point, p2: Point, p3: Point) {
        super(p0, p1, p2, p3)
    }

    // 需要转换为线段进行相交、等计算

    get type() {
        return "C"
    }
}