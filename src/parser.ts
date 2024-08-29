
const pathCommand = /([achlmrqstvz])[\s,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?\s*,?\s*)+)/ig;
const pathValues = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)\s*,?\s*/ig;

export function parsePathString(pathString: string): (string | number)[][] {
    if (!pathString) {
        return [];
    }
    // const pth = paths(pathString);
    // if (pth.arr) {
    //     return pathClone(pth.arr);
    // }

    const paramCounts: any = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };
    const data: (string | number)[][] = [];
    // if (R.is(pathString, array) && R.is(pathString[0], array)) { // rough assumption
    //     data = pathClone(pathString);
    // }
    // if (!data.length) {
    pathString.replace(pathCommand, function (a: string, b: string, c: string): string {
        const params: (string | number)[] = [];
        let name = b.toLowerCase();
        c.replace(pathValues, function (a: string, b: string): string {
            b && params.push(+b);
            return "";
        });
        if (name == "m" && params.length > 2) {
            data.push(([b] as (string | number)[]).concat(params.splice(0, 2)));
            name = "l";
            b = b == "m" ? "l" : "L";
        }
        if (name == "r") {
            data.push(([b] as (string | number)[]).concat(params));
        } else while (params.length >= paramCounts[name]) {
            data.push(([b] as (string | number)[]).concat(params.splice(0, paramCounts[name])));
            if (!paramCounts[name]) {
                break;
            }
        }
        return "";// todo
    });

    // }
    // data.toString = R._path2string;
    // pth.arr = pathClone(data);
    return data;
}