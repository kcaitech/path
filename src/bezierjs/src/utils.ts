// import { Bezier } from "./bezier.js";

// import { Point, Line } from "../../src/basic";

type Point = {
    x: number;
    y: number;
}

type Line = {
    p1: Point,
    p2: Point
}
// math-inlining.
const { abs, cos, sin, acos, atan2, sqrt, pow } = Math;

// cube root function yielding real roots
function crt(v: number) {
    return v < 0 ? -pow(-v, 1 / 3) : pow(v, 1 / 3);
}

// trig constants
const pi = Math.PI,
    tau = 2 * pi,
    quart = pi / 2,
    // float precision significant decimal
    epsilon = 0.000001,
    // extremas used in bbox calculation and similar algorithms
    nMax = Number.MAX_SAFE_INTEGER || 9007199254740991,
    nMin = Number.MIN_SAFE_INTEGER || -9007199254740991,
    // a zero coordinate, which is surprisingly useful
    ZERO = { x: 0, y: 0 };



export type PointT = Point & { t: number }

export type BBoxAxis = {
    min: number, mid: number, max: number, size: number
}

export type BBox = {
    x: BBoxAxis,
    y: BBoxAxis
}

function p2pt(p: Point, t: number) {
    const _p = p as PointT;
    _p.t = t;
    return _p;
}

// Legendre-Gauss abscissae with n=24 (x_i values, defined at i=n as the roots of the nth order Legendre polynomial Pn(x))
const Tvalues: number[] = [
    -0.0640568928626056260850430826247450385909,
    0.0640568928626056260850430826247450385909,
    -0.1911188674736163091586398207570696318404,
    0.1911188674736163091586398207570696318404,
    -0.3150426796961633743867932913198102407864,
    0.3150426796961633743867932913198102407864,
    -0.4337935076260451384870842319133497124524,
    0.4337935076260451384870842319133497124524,
    -0.5454214713888395356583756172183723700107,
    0.5454214713888395356583756172183723700107,
    -0.6480936519369755692524957869107476266696,
    0.6480936519369755692524957869107476266696,
    -0.7401241915785543642438281030999784255232,
    0.7401241915785543642438281030999784255232,
    -0.8200019859739029219539498726697452080761,
    0.8200019859739029219539498726697452080761,
    -0.8864155270044010342131543419821967550873,
    0.8864155270044010342131543419821967550873,
    -0.9382745520027327585236490017087214496548,
    0.9382745520027327585236490017087214496548,
    -0.9747285559713094981983919930081690617411,
    0.9747285559713094981983919930081690617411,
    -0.9951872199970213601799974097007368118745,
    0.9951872199970213601799974097007368118745,
]

// Legendre-Gauss weights with n=24 (w_i values, defined by a function linked to in the Bezier primer article)
const Cvalues: number[] = [
    0.1279381953467521569740561652246953718517,
    0.1279381953467521569740561652246953718517,
    0.1258374563468282961213753825111836887264,
    0.1258374563468282961213753825111836887264,
    0.121670472927803391204463153476262425607,
    0.121670472927803391204463153476262425607,
    0.1155056680537256013533444839067835598622,
    0.1155056680537256013533444839067835598622,
    0.1074442701159656347825773424466062227946,
    0.1074442701159656347825773424466062227946,
    0.0976186521041138882698806644642471544279,
    0.0976186521041138882698806644642471544279,
    0.086190161531953275917185202983742667185,
    0.086190161531953275917185202983742667185,
    0.0733464814110803057340336152531165181193,
    0.0733464814110803057340336152531165181193,
    0.0592985849154367807463677585001085845412,
    0.0592985849154367807463677585001085845412,
    0.0442774388174198061686027482113382288593,
    0.0442774388174198061686027482113382288593,
    0.0285313886289336631813078159518782864491,
    0.0285313886289336631813078159518782864491,
    0.0123412297999871995468056670700372915759,
    0.0123412297999871995468056670700372915759,
]

// Bezier utility functions
export const utils = {


    arcfn: function (t: number, derivativeFn: ((t: number) => Point)) {
        const d = derivativeFn(t);
        const l = d.x * d.x + d.y * d.y;
        // if (typeof d.z !== "undefined") {
        //     l += d.z * d.z;
        // }
        return sqrt(l);
    },

    compute: function (t: number, points: Point[]): PointT {
        // shortcuts
        if (t === 0) {
            // points[0].t = 0;
            return p2pt(points[0], 0);
        }

        const order = points.length - 1;
        // if (order !== 2 && order !== 3) throw new Error("order: " + order);

        if (t === 1) {
            // points[order].t = 1;
            // return points[order];
            return p2pt(points[order], t);
        }

        const mt = 1 - t;
        let p = points;

        // constant?
        if (order === 0) {
            // points[0].t = t;
            // return points[0];
            return p2pt(points[0], t);
        }

        // // linear?
        if (order === 1) {
            const ret: PointT = {
                x: mt * p[0].x + t * p[1].x,
                y: mt * p[0].y + t * p[1].y,
                t: t,
            };
            // if (_3d) {
            //     ret.z = mt * p[0].z + t * p[1].z;
            // }
            return ret;
        }

        // quadratic/cubic curve?
        if (order < 4) {
            let mt2 = mt * mt,
                t2 = t * t,
                a,
                b,
                c,
                d = 0;
            if (order === 2) {
                p = [p[0], p[1], p[2], ZERO];
                a = mt2;
                b = mt * t * 2;
                c = t2;
            } else {
                a = mt2 * mt;
                b = mt2 * t * 3;
                c = mt * t2 * 3;
                d = t * t2;
            }
            const ret: PointT = {
                x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x,
                y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y,
                t: t,
            };
            // if (_3d) {
            //     ret.z = a * p[0].z + b * p[1].z + c * p[2].z + d * p[3].z;
            // }
            return ret;
        }

        // higher order curves: use de Casteljau's computation
        const dCpts = points.slice(0).map(p => Object.assign({}, p)); //JSON.parse(JSON.stringify(points));
        while (dCpts.length > 1) {
            for (let i = 0; i < dCpts.length - 1; i++) {
                dCpts[i] = {
                    x: dCpts[i].x + (dCpts[i + 1].x - dCpts[i].x) * t,
                    y: dCpts[i].y + (dCpts[i + 1].y - dCpts[i].y) * t,
                };
                // if (typeof dCpts[i].z !== "undefined") {
                //     dCpts[i].z = dCpts[i].z + (dCpts[i + 1].z - dCpts[i].z) * t;
                // }
            }
            dCpts.splice(dCpts.length - 1, 1);
        }
        // dCpts[0].t = t;
        // return dCpts[0];
        return p2pt(dCpts[0], t);
    },

    computeWithRatios: function (t: number, points: Point[], ratios: number[]) {

        if (points.length !== 3 && points.length !== 4) throw new Error();

        const mt = 1 - t,
            r = ratios,
            p = points;

        let f1 = r[0],
            f2 = r[1],
            f3 = r[2],
            f4 = r[3],
            d;

        // spec for linear
        f1 *= mt;
        f2 *= t;

        if (p.length === 2) {
            d = f1 + f2;
            return {
                x: (f1 * p[0].x + f2 * p[1].x) / d,
                y: (f1 * p[0].y + f2 * p[1].y) / d,
                // z: !_3d ? false : (f1 * p[0].z + f2 * p[1].z) / d,
                t: t,
            };
        }

        // upgrade to quadratic
        f1 *= mt;
        f2 *= 2 * mt;
        f3 *= t * t;

        if (p.length === 3) {
            d = f1 + f2 + f3;
            return {
                x: (f1 * p[0].x + f2 * p[1].x + f3 * p[2].x) / d,
                y: (f1 * p[0].y + f2 * p[1].y + f3 * p[2].y) / d,
                // z: !_3d ? false : (f1 * p[0].z + f2 * p[1].z + f3 * p[2].z) / d,
                t: t,
            };
        }

        // upgrade to cubic
        f1 *= mt;
        f2 *= 1.5 * mt;
        f3 *= 3 * mt;
        f4 *= t * t * t;

        // if (p.length === 4) 
        {
            d = f1 + f2 + f3 + f4;
            return {
                x: (f1 * p[0].x + f2 * p[1].x + f3 * p[2].x + f4 * p[3].x) / d,
                y: (f1 * p[0].y + f2 * p[1].y + f3 * p[2].y + f4 * p[3].y) / d,
                // z: !_3d
                //     ? false
                //     : (f1 * p[0].z + f2 * p[1].z + f3 * p[2].z + f4 * p[3].z) / d,
                t: t,
            };
        }
    },

    derive: function (points: Point[]) {
        const dpoints: Point[][] = [];
        for (let p = points, d = p.length, c = d - 1; d > 1; d--, c--) {
            const list: Point[] = [];
            for (let j = 0; j < c; j++) {
                const dpt = {
                    x: c * (p[j + 1].x - p[j].x),
                    y: c * (p[j + 1].y - p[j].y),
                };
                // if (_3d) {
                //     dpt.z = c * (p[j + 1].z - p[j].z);
                // }
                list.push(dpt);
            }
            dpoints.push(list);
            p = list;
        }
        return dpoints;
    },

    between: function (v: number, m: number, M: number) {
        return (
            (m <= v && v <= M) ||
            utils.approximately(v, m) ||
            utils.approximately(v, M)
        );
    },

    approximately: function (a: number, b: number, precision?: number) {
        return abs(a - b) <= (precision || epsilon);
    },

    length: function (derivativeFn: ((t: number) => Point)) {
        const z = 0.5,
            len = Tvalues.length;

        let sum = 0;

        for (let i = 0; i < len; i++) {
            const t = z * Tvalues[i] + z;
            sum += Cvalues[i] * utils.arcfn(t, derivativeFn);
        }
        return z * sum;
    },

    map: function (v: number, ds: number, de: number, ts: number, te: number) {
        const d1 = de - ds,
            d2 = te - ts,
            v2 = v - ds,
            r = v2 / d1;
        return ts + d2 * r;
    },

    lerp: function (r: number, v1: Point, v2: Point) {
        const ret = {
            x: v1.x + r * (v2.x - v1.x),
            y: v1.y + r * (v2.y - v1.y),
        };
        // if (v1.z !== undefined && v2.z !== undefined) {
        //     ret.z = v1.z + r * (v2.z - v1.z);
        // }
        return ret;
    },

    pointToString: function (p: Point) {
        let s = p.x + "/" + p.y;
        // if (typeof p.z !== "undefined") {
        //     s += "/" + p.z;
        // }
        return s;
    },

    pointsToString: function (points: Point[]) {
        return "[" + points.map(utils.pointToString).join(", ") + "]";
    },

    copy: function <T extends Object>(obj: T): T {
        return Object.assign({}, obj) //JSON.parse(JSON.stringify(obj));
    },

    angle: function (o: Point, v1: Point, v2: Point) {
        const dx1 = v1.x - o.x,
            dy1 = v1.y - o.y,
            dx2 = v2.x - o.x,
            dy2 = v2.y - o.y,
            cross = dx1 * dy2 - dy1 * dx2, // 叉积 外积 法向量
            dot = dx1 * dx2 + dy1 * dy2; // 点积 内积
        return atan2(cross, dot); // [-Pi, Pi]
    },

    // round as string, to avoid rounding errors
    round: function (v: number, d: number) {
        const s = "" + v;
        const pos = s.indexOf(".");
        return parseFloat(s.substring(0, pos + 1 + d));
    },

    dist: function (p1: Point, p2: Point) {
        const dx = p1.x - p2.x,
            dy = p1.y - p2.y;
        return sqrt(dx * dx + dy * dy);
    },

    closest: function (LUT: PointT[], point: Point): { mdist: number, mpos: number } {
        let mdist = Number.MAX_VALUE,//pow(2, 63),
            mpos = 0;
        LUT.forEach(function (p, idx) {
            const d = utils.dist(point, p);
            if (d < mdist) {
                mdist = d;
                mpos = idx;
            }
        });
        return { mdist: mdist, mpos: mpos };
    },

    abcratio: function (t: number, n: 2 | 3) {
        // see ratio(t) note on http://pomax.github.io/bezierinfo/#abc
        // if (n !== 2 && n !== 3) {
        //     return false;
        // }
        if (typeof t === "undefined") {
            t = 0.5;
        } else if (t === 0 || t === 1) {
            return t;
        }
        const bottom = pow(t, n) + pow(1 - t, n),
            top = bottom - 1;
        return abs(top / bottom);
    },

    projectionratio: function (t: number, n: 2 | 3) {
        // see u(t) note on http://pomax.github.io/bezierinfo/#abc
        // if (n !== 2 && n !== 3) {
        //     return false;
        // }
        if (typeof t === "undefined") {
            t = 0.5;
        } else if (t === 0 || t === 1) {
            return t;
        }
        const top = pow(1 - t, n),
            bottom = pow(t, n) + top;
        return top / bottom;
    },

    lli8: function (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
        const nx =
            (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
            ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4),
            d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (d == 0) {
            return;
        }
        return { x: nx / d, y: ny / d };
    },

    lli4: function (p1: Point, p2: Point, p3: Point, p4: Point) {
        const x1 = p1.x,
            y1 = p1.y,
            x2 = p2.x,
            y2 = p2.y,
            x3 = p3.x,
            y3 = p3.y,
            x4 = p4.x,
            y4 = p4.y;
        return utils.lli8(x1, y1, x2, y2, x3, y3, x4, y4);
    },

    // lli: function (v1, v2) {
    //     return utils.lli4(v1, v1.c, v2, v2.c);
    // },


    findbbox: function (sections: { bbox: () => BBox }[]): BBox {
        let mx = nMax,
            my = nMax,
            MX = nMin,
            MY = nMin;
        sections.forEach(function (s) {
            const bbox = s.bbox();
            if (mx > bbox.x.min) mx = bbox.x.min;
            if (my > bbox.y.min) my = bbox.y.min;
            if (MX < bbox.x.max) MX = bbox.x.max;
            if (MY < bbox.y.max) MY = bbox.y.max;
        });
        return {
            x: { min: mx, mid: (mx + MX) / 2, max: MX, size: MX - mx },
            y: { min: my, mid: (my + MY) / 2, max: MY, size: MY - my },
        };
    },

    getminmax: function (curve: { get: (t: number) => Point }, d: 'x' | 'y', list: number[]): BBoxAxis {
        if (!list) return { min: 0, max: 0, size: 0, mid: 0 };
        let min = nMax,
            max = nMin,
            t,
            c;
        if (list.indexOf(0) === -1) {
            list = [0].concat(list);
        }
        if (list.indexOf(1) === -1) {
            list.push(1);
        }
        for (let i = 0, len = list.length; i < len; i++) {
            t = list[i];
            c = curve.get(t);
            if (c[d] < min) {
                min = c[d];
            }
            if (c[d] > max) {
                max = c[d];
            }
        }
        return { min: min, mid: (min + max) / 2, max: max, size: max - min };
    },

    align: function (points: Point[], line: Line) {
        const tx = line.p1.x,
            ty = line.p1.y,
            a = -atan2(line.p2.y - ty, line.p2.x - tx),
            d = function (v: Point) {
                return {
                    x: (v.x - tx) * cos(a) - (v.y - ty) * sin(a),
                    y: (v.x - tx) * sin(a) + (v.y - ty) * cos(a),
                };
            };
        return points.map(d);
    },

    roots: function (points: Point[], line?: Line): number[] {
        // line = line || { p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 } };

        const order = points.length - 1;
        const aligned = line ? utils.align(points, line) : points;
        const accept = function (t: number) {
            return 0 <= t && t <= 1;
        };

        if (order === 2) {
            const a = aligned[0].y,
                b = aligned[1].y,
                c = aligned[2].y,
                d = a - 2 * b + c;
            if (d !== 0) {
                const m1 = -sqrt(b * b - a * c),
                    m2 = -a + b,
                    v1 = -(m1 + m2) / d,
                    v2 = -(-m1 + m2) / d;
                return [v1, v2].filter(accept);
            } else if (b !== c && d === 0) {
                return [(2 * b - c) / (2 * b - 2 * c)].filter(accept);
            }
            return [];
        }

        // see http://www.trans4mind.com/personal_development/mathematics/polynomials/cubicAlgebra.htm
        const pa = aligned[0].y,
            pb = aligned[1].y,
            pc = aligned[2].y,
            pd = aligned[3].y;

        let a = -pa + 3 * pb - 3 * pc + pd,
            b = 3 * pa - 6 * pb + 3 * pc,
            c = -3 * pa + 3 * pb,
            d = pa;

        if (utils.approximately(a, 0)) {
            // this is not a cubic curve.
            if (utils.approximately(b, 0)) {
                // in fact, this is not a quadratic curve either.
                if (utils.approximately(c, 0)) {
                    // in fact in fact, there are no solutions.
                    return [];
                }
                // linear solution:
                return [-d / c].filter(accept);
            }
            // quadratic solution:
            const q = sqrt(c * c - 4 * b * d),
                a2 = 2 * b;
            return [(q - c) / a2, (-c - q) / a2].filter(accept);
        }

        // at this point, we know we need a cubic solution:
        // Cardano's algorithm
        b /= a;
        c /= a;
        d /= a;

        const p = (3 * c - b * b) / 3,
            p3 = p / 3,
            q = (2 * b * b * b - 9 * b * c + 27 * d) / 27,
            q2 = q / 2,
            discriminant = q2 * q2 + p3 * p3 * p3;

        let u1, v1, x1, x2, x3;
        if (discriminant < 0) {
            const mp3 = -p / 3,
                mp33 = mp3 * mp3 * mp3,
                r = sqrt(mp33),
                t = -q / (2 * r),
                cosphi = t < -1 ? -1 : t > 1 ? 1 : t,
                phi = acos(cosphi),
                crtr = crt(r),
                t1 = 2 * crtr;
            x1 = t1 * cos(phi / 3) - b / 3;
            x2 = t1 * cos((phi + tau) / 3) - b / 3;
            x3 = t1 * cos((phi + 2 * tau) / 3) - b / 3;
            return [x1, x2, x3].filter(accept);
        } else if (discriminant === 0) {
            u1 = q2 < 0 ? crt(-q2) : -crt(q2);
            x1 = 2 * u1 - b / 3;
            x2 = -u1 - b / 3;
            return [x1, x2].filter(accept);
        } else {
            const sd = sqrt(discriminant);
            u1 = crt(-q2 + sd);
            v1 = crt(q2 + sd);
            return [u1 - v1 - b / 3].filter(accept);
        }
    },

    droots: function (p: number[]) {
        // quadratic roots are easy
        if (p.length === 3) {
            const a = p[0],
                b = p[1],
                c = p[2],
                d = a - 2 * b + c;
            if (d !== 0) {
                const m1 = -sqrt(b * b - a * c),
                    m2 = -a + b,
                    v1 = -(m1 + m2) / d,
                    v2 = -(-m1 + m2) / d;
                return [v1, v2];
            } else if (b !== c && d === 0) {
                return [(2 * b - c) / (2 * (b - c))];
            }
            return [];
        }

        // linear roots are even easier
        if (p.length === 2) {
            const a = p[0],
                b = p[1];
            if (a !== b) {
                return [a / (a - b)];
            }
            return [];
        }

        return [];
    },

    curvature: function (t: number, d1: Point[], d2: Point[], kOnly?: boolean): { k: number, r: number, dk?: number, adk?: number } {
        let num,
            dnm,
            adk,
            dk,
            k = 0,
            r = 0;

        //
        // We're using the following formula for curvature:
        //
        //              x'y" - y'x"
        //   k(t) = ------------------
        //           (x'² + y'²)^(3/2)
        //
        // from https://en.wikipedia.org/wiki/Radius_of_curvature#Definition
        //
        // With it corresponding 3D counterpart:
        //
        //          sqrt( (y'z" - y"z')² + (z'x" - z"x')² + (x'y" - x"y')²)
        //   k(t) = -------------------------------------------------------
        //                     (x'² + y'² + z'²)^(3/2)
        //

        const d = utils.compute(t, d1);
        const dd = utils.compute(t, d2);
        const qdsum = d.x * d.x + d.y * d.y;

        // if (_3d) {
        //     num = sqrt(
        //         pow(d.y * dd.z - dd.y * d.z, 2) +
        //         pow(d.z * dd.x - dd.z * d.x, 2) +
        //         pow(d.x * dd.y - dd.x * d.y, 2)
        //     );
        //     dnm = pow(qdsum + d.z * d.z, 3 / 2);
        // } else 
        {
            num = d.x * dd.y - d.y * dd.x;
            dnm = pow(qdsum, 3 / 2);
        }

        if (num === 0 || dnm === 0) {
            return { k: 0, r: 0 };
        }

        k = num / dnm;
        r = dnm / num;

        // We're also computing the derivative of kappa, because
        // there is value in knowing the rate of change for the
        // curvature along the curve. And we're just going to
        // ballpark it based on an epsilon.
        if (!kOnly) {
            // compute k'(t) based on the interval before, and after it,
            // to at least try to not introduce forward/backward pass bias.
            const pk = utils.curvature(t - 0.001, d1, d2, true).k;
            const nk = utils.curvature(t + 0.001, d1, d2, true).k;
            dk = (nk - k + (k - pk)) / 2;
            adk = (abs(nk - k) + abs(k - pk)) / 2;
        }

        return { k: k, r: r, dk: dk, adk: adk };
    },

    inflections: function (points: Point[]) {
        if (points.length < 4) return [];

        // FIXME: TODO: add in inflection abstraction for quartic+ curves?

        const p = utils.align(points, { p1: points[0], p2: points.slice(-1)[0] }),
            a = p[2].x * p[1].y,
            b = p[3].x * p[1].y,
            c = p[1].x * p[2].y,
            d = p[3].x * p[2].y,
            v1 = 18 * (-3 * a + 2 * b + 3 * c - d),
            v2 = 18 * (3 * a - b - 3 * c),
            v3 = 18 * (c - a);

        if (utils.approximately(v1, 0)) {
            if (!utils.approximately(v2, 0)) {
                let t = -v3 / v2;
                if (0 <= t && t <= 1) return [t];
            }
            return [];
        }

        const d2 = 2 * v1;

        if (utils.approximately(d2, 0)) return [];

        const trm = v2 * v2 - 4 * v1 * v3;

        if (trm < 0) return [];

        const sq = Math.sqrt(trm);

        return [(sq - v2) / d2, -(v2 + sq) / d2].filter(function (r) {
            return 0 <= r && r <= 1;
        });
    },

    bboxoverlap: function (b1: BBox, b2: BBox) {
        const dims: ('x' | 'y')[] = ["x", "y"],
            len = dims.length;

        for (let i = 0, l, t, d; i < len; i++) {
            const dim = dims[i];
            l = b1[dim].mid;
            t = b2[dim].mid;
            d = (b1[dim].size + b2[dim].size) / 2;
            if (abs(l - t) >= d) return false;
        }
        return true;
    },

    expandbox: function (bbox: BBox, _bbox: BBox) {
        if (_bbox.x.min < bbox.x.min) {
            bbox.x.min = _bbox.x.min;
        }
        if (_bbox.y.min < bbox.y.min) {
            bbox.y.min = _bbox.y.min;
        }
        // if (_bbox.z && _bbox.z.min < bbox.z.min) {
        //     bbox.z.min = _bbox.z.min;
        // }
        if (_bbox.x.max > bbox.x.max) {
            bbox.x.max = _bbox.x.max;
        }
        if (_bbox.y.max > bbox.y.max) {
            bbox.y.max = _bbox.y.max;
        }
        // if (_bbox.z && _bbox.z.max > bbox.z.max) {
        //     bbox.z.max = _bbox.z.max;
        // }
        bbox.x.mid = (bbox.x.min + bbox.x.max) / 2;
        bbox.y.mid = (bbox.y.min + bbox.y.max) / 2;
        // if (bbox.z) {
        //     bbox.z.mid = (bbox.z.min + bbox.z.max) / 2;
        // }
        bbox.x.size = bbox.x.max - bbox.x.min;
        bbox.y.size = bbox.y.max - bbox.y.min;
        // if (bbox.z) {
        //     bbox.z.size = bbox.z.max - bbox.z.min;
        // }
    },

    getccenter: function (p1: Point, p2: Point, p3: Point): { x: number, y: number, s: number, e: number, r: number } | undefined {
        const dx1 = p2.x - p1.x,
            dy1 = p2.y - p1.y,
            dx2 = p3.x - p2.x,
            dy2 = p3.y - p2.y,
            dx1p = dx1 * cos(quart) - dy1 * sin(quart),
            dy1p = dx1 * sin(quart) + dy1 * cos(quart),
            dx2p = dx2 * cos(quart) - dy2 * sin(quart),
            dy2p = dx2 * sin(quart) + dy2 * cos(quart),
            // chord midpoints
            mx1 = (p1.x + p2.x) / 2,
            my1 = (p1.y + p2.y) / 2,
            mx2 = (p2.x + p3.x) / 2,
            my2 = (p2.y + p3.y) / 2,
            // midpoint offsets
            mx1n = mx1 + dx1p,
            my1n = my1 + dy1p,
            mx2n = mx2 + dx2p,
            my2n = my2 + dy2p,
            // intersection of these lines:
            arc = utils.lli8(mx1, my1, mx1n, my1n, mx2, my2, mx2n, my2n);
        if (!arc) return;
        const _arc = arc as { x: number, y: number, s: number, e: number, r: number }
        const r = utils.dist(arc, p1);

        // arc start/end values, over mid point:
        let s = atan2(p1.y - arc.y, p1.x - arc.x),
            m = atan2(p2.y - arc.y, p2.x - arc.x),
            e = atan2(p3.y - arc.y, p3.x - arc.x),
            _;

        // determine arc direction (cw/ccw correction)
        if (s < e) {
            // if s<m<e, arc(s, e)
            // if m<s<e, arc(e, s + tau)
            // if s<e<m, arc(e, s + tau)
            if (s > m || m > e) {
                s += tau;
            }
            if (s > e) {
                _ = e;
                e = s;
                s = _;
            }
        } else {
            // if e<m<s, arc(e, s)
            // if m<e<s, arc(s, e + tau)
            // if e<s<m, arc(s, e + tau)
            if (e < m && m < s) {
                _ = e;
                e = s;
                s = _;
            } else {
                e += tau;
            }
        }
        // assign and done.
        _arc.s = s;
        _arc.e = e;
        _arc.r = r;
        return _arc;
    },

    numberSort: function (a: number, b: number) {
        return a - b;
    },
};

