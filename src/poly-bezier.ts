import { Bezier } from "./bezier";
import { Point, utils } from "./utils";

/**
 * Poly Bezier
 * @param {[type]} curves [description]
 */
export class PolyBezier {
    constructor(public curves: Bezier[]) {

    }

    valueOf() {
        return this.toString();
    }

    toString() {
        return (
            "[" +
            this.curves
                .map(function (curve) {
                    return utils.pointsToString(curve.points);
                })
                .join(", ") +
            "]"
        );
    }

    addCurve(curve: Bezier) {
        this.curves.push(curve);
    }

    length() {
        return this.curves
            .map(function (v) {
                return v.length();
            })
            .reduce(function (a, b) {
                return a + b;
            });
    }

    curve(idx: number) {
        return this.curves[idx];
    }

    bbox() {
        const c = this.curves;
        var bbox = c[0].bbox();
        for (var i = 1; i < c.length; i++) {
            utils.expandbox(bbox, c[i].bbox());
        }
        return bbox;
    }

    offset(d: number) {
        const offset: (Bezier)[] = [];
        this.curves.forEach(function (v) {
            offset.push(...v.offset(d));
        });
        return new PolyBezier(offset);
    }
}

