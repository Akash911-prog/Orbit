import { KEYBOARD_LAYOUT } from '../constants';

export function editDistance(
    srcString: string,
    targetString: string,
    minConfidence: number = 8,
    minEditDistance: number = 2
) {
    const [src, target] = padShorterString(srcString, targetString);
    const matrix: number[][] = [];

    for (let i = 0; i <= src.length; i++) {
        matrix[i] = [];
        matrix[i]![0] = i;
    }
    for (let j = 0; j <= target.length; j++) {
        matrix[0]![j] = j;
    }

    for (let i = 1; i <= src.length; i++) {
        for (let j = 1; j <= target.length; j++) {
            const charSrc = src[i - 1]!;
            const charTarget = target[j - 1]!;

            // 1. KEYBOARD DISTANCE LAYER
            // Instead of a flat cost of 1, adjacent typos (e.g., 'w' instead of 'e') cost much less (e.g., ~0.3)
            const substitutionCost =
                charSrc === charTarget
                    ? 0
                    : getKeyboardDistance(charSrc, charTarget);

            matrix[i]![j] = Math.min(
                matrix[i - 1]![j]! + 1, // Deletion
                matrix[i]![j - 1]! + 1, // Insertion
                matrix[i - 1]![j - 1]! + substitutionCost // Weighted Substitution
            );

            // Swap step (keeps a flat cost of 1 for transpositions, or scale if desired)
            if (
                i > 1 &&
                j > 1 &&
                src[i - 1] === target[j - 2] &&
                src[i - 2] === target[j - 1]
            ) {
                matrix[i]![j] = Math.min(
                    matrix[i]![j]!,
                    matrix[i - 2]![j - 2]! + 1
                );
            }
        }
    }

    // Fetch final weighted distance from the bottom-right of the matrix
    const finalDistance = matrix[src.length]![target.length]!;

    // 2. CONFIDENCE LAYER
    // Calculate confidence on a 0-10 scale based on how much of the string is correct.
    const maxLength = Math.max(srcString.length, targetString.length);
    let confidence = 10;

    if (maxLength > 0) {
        // If finalDistance is 0, confidence is 10. If finalDistance equals maxLength, confidence is 0.
        confidence = ((maxLength - finalDistance) / maxLength) * 10;
    }

    return {
        matrix,
        finalDistance,
        confidence: Math.max(0, confidence), // clamp at 0
        passesConfidence: confidence >= minConfidence,
        passesMinDistance: finalDistance <= minEditDistance,
    };
}

export function padShorterString(a: string, b: string): [string, string] {
    const maxLength = Math.max(a.length, b.length);

    // .padEnd() automatically does nothing if the string is already at or past maxLength
    return [a.padEnd(maxLength, ' '), b.padEnd(maxLength, ' ')];
}

function getKeyboardDistance(charA: string, charB: string): number {
    const cordA = KEYBOARD_LAYOUT[charA.toLowerCase()];
    const cordB = KEYBOARD_LAYOUT[charB.toLowerCase()];

    if (!cordA || !cordB) return 1.0;

    const distance = Math.sqrt(
        (cordB[0] - cordA[0]) ** 2 + (cordB[1] - cordA[1]) ** 2
    );

    return distance;
}
