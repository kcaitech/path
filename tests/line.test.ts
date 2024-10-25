import { Line } from "../src/line"

describe(`line`, () => {
    test('pointAt', () => {

    })
    test('bbox', () => {

    })
    test('split', () => {

    })
    test('intersect', () => {

    })
    test('intersect2', () => {
        const p1 = {
            x: 142.9006727063226,
            y: 174.57013995718242,
        }
        const p2 = {
            x: 90,
            y: 121.47237570073104,
        }
        const line = new Line(p1, p2)
        const rect = { x: 92, y: 132, w: 44, h: 44 }
        expect(line.intersect2(rect)).toBe(true)
    })
    test('coincident', () => {
        const p1 = [
            { x: 50, y: 100 },
            { x: 50, y: 200 },
        ]
        const p2 = [
            { x: 50, y: 170 },
            { x: 50, y: 270 }
        ]
        const p3 = [
            { x: 50, y: 200 },
            { x: 50, y: 270 }
        ]

        const line1 = new Line(p1[0], p1[1])
        const line2 = new Line(p2[0], p2[1])
        const line3 = new Line(p3[0], p3[1])

        const coincident = line1.coincident(line2);
        const coincident2 = line1.coincident(line3);
        expect(coincident).toStrictEqual({
            type: "coincident", t0: 0.7, t1: 1, t2: 0, t3: 0.3
        })
        expect(coincident2).toStrictEqual(undefined)
    })
})