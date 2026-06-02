export function editDistance(
    srcString: string,
    targetString: string,
    minConfidence: number = 8,
    minEditDistance: number = 2
) {
    const matrix: number[][] = [];
}

function getKeyboardDistance(charA: string, charB: string): number {
    const KEYBOARD_LAYOUT: Record<string, [number, number]> = {
        q: [0, 0],
        w: [1, 0],
        e: [2, 0],
        r: [3, 0],
        t: [4, 0],
        y: [5, 0],
        u: [6, 0],
        i: [7, 0],
        o: [8, 0],
        p: [9, 0],
        a: [0.5, 1],
        s: [1.5, 1],
        d: [2.5, 1],
        f: [3.5, 1],
        g: [4.5, 1],
        h: [5.5, 1],
        j: [6.5, 1],
        k: [7.5, 1],
        l: [8.5, 1],
        z: [1.5, 2],
        x: [2.5, 2],
        c: [3.5, 2],
        v: [4.5, 2],
        b: [5.5, 2],
        n: [6.5, 2],
        m: [7.5, 2],
    };

    const cordA = KEYBOARD_LAYOUT[charA.toLowerCase()];
    const cordB = KEYBOARD_LAYOUT[charB.toLowerCase()];

    if (!cordA || !cordB) return 1.0;

    const distance = Math.sqrt(
        (cordB[0] - cordA[0]) ** 2 + (cordB[1] - cordA[1]) ** 2
    );

    return distance;
}
