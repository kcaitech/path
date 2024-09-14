import { Normalizer } from "./normalize";
import { Path1 } from "./path1";

const pathCommand = /([achlmrqstvz])[\s,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?\s*,?\s*)+)/ig;
const pathValues = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s*,?\s*/ig;
const paramCounts: { [key: string]: number } = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };

export function parsePath(pathString: string): Path1[] {
    if (!pathString) {
        return [];
    }

    const nor = new Normalizer();
    pathString.replace(pathCommand, function (substring: string, b: string, c: string): string {
        const params: (string | number)[] = [];
        let name = b.toLowerCase();
        c.replace(pathValues, function (substring: string, b: string): string {
            b && params.push(+b);
            return "";
        });
        if (name == "m" && params.length > 2) {
            nor.add(([b] as (string | number)[]).concat(params.splice(0, 2)));
            name = "l";
            b = b == "m" ? "l" : "L";
        }
        if (name == "r") {
            // data.push(([b] as (string | number)[]).concat(params));
        } else while (params.length >= paramCounts[name]) {
            nor.add(([b] as (string | number)[]).concat(params.splice(0, paramCounts[name])));
            if (!paramCounts[name]) {
                break;
            }
        }
        return "";
    });

    return nor.getPaths();
}