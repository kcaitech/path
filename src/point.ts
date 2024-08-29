// 2-dimensional point object.

export default class Point {
    x: number;
    y: number;
    constructor(x?: number, y?: number) {
        this.x = x !== undefined ? x : 0;
        this.y = y !== undefined ? y : 0;
    }
    static read(x: number): Point;
    static read(x: number, y: number): Point;
    static read(p: number[]): Point;
    static read(p: Point): Point;
    static read(p: { x: number, y: number }): Point;
    static read(x: number | number[] | { x: number, y: number } | Point, y?: number) {
        if (arguments.length === 2) {
            return new Point(x as number, y as number);
        }
        var arg = x;
        if (arg instanceof Point) {
            return arg;
        } else if (typeof arg === "number") {
            return new Point(arg, arg);
        } else if (Array.isArray(arg)) {
            if (arg.length === 0) {
                return Point.ZERO;
            }
            x = arg[0];
            y = arg.length > 1 ? arg[1] : x;
            return new Point(x, y);
        } else if (arg.x !== undefined && arg.y !== undefined) {
            return new Point(arg.x, arg.y);
        } else {
            return Point.ZERO;
        }
    }
    clone() {
        return new Point(this.x, this.y);
    }
    add(v: Point) {
        return new Point(this.x + v.x, this.y + v.y);
    }
    sub(v: Point) {
        return new Point(this.x - v.x, this.y - v.y);
    }
    subtract(v: Point) {
        return new Point(this.x - v.x, this.y - v.y);
    }
    divide(n: number) {
        return new Point(this.x / n, this.y / n);
    }
    multiply(n: number) {
        return new Point(this.x * n, this.y * n);
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }
    heading() {
        return Math.atan2(this.y, this.x);
    }
    distanceTo(v: Point) {
        var dx = this.x - v.x,
            dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    normalize() {
        var m = this.magnitude();
        if (m !== 0) {
            return this.divide(m);
        } else {
            return Point.ZERO;
        }
    }
    limit(speed: number) {
        if (this.magnitudeSquared() > speed * speed) {
            return this.normalize().multiply(speed);
        }
        return this;
    }
    translate(tx: number, ty: number) {
        return new Point(this.x + tx, this.y + ty);
    }
    scale(sx: number, sy: number) {
        sy = sy !== undefined ? sy : sx;
        return new Point(this.x * sx, this.y * sy);
    }
    toString() {
        return "[" + this.x + ", " + this.y + "]";
    }

    get xy() {
        return [this.x, this.y];
    }

    static ZERO = new Point(0, 0);
}

