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
})