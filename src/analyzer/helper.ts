import type { OrbType } from '../types';
import type { AnalyzerContext } from './context';

export function expectType(
    expected: OrbType,
    actual: OrbType,
    node: any,
    ctx: AnalyzerContext
): boolean {
    if (expected.kind !== actual.kind) {
        ctx.reportError(`Expected type ${expected.kind}`, node);
        return false;
    }
    return true;
}

export function typesEqual(a: OrbType, b: OrbType): boolean {
    // 'unknown' short-circuits as compatible with anything —
    // prevents cascading false-positive errors once one error already fired
    if (a.kind === 'unknown' || b.kind === 'unknown') return true;

    if (a.kind !== b.kind) return false;

    switch (a.kind) {
        case 'int':
        case 'float':
        case 'bool':
        case 'str':
        case 'String':
        case 'char':
        case 'byte':
        case 'void':
            return true; // kind match already confirmed above, no payload to compare

        case 'array':
            return typesEqual(a.element, (b as typeof a).element);

        case 'map': {
            const bMap = b as typeof a;
            return (
                typesEqual(a.key, bMap.key) && typesEqual(a.value, bMap.value)
            );
        }

        case 'tuple': {
            const bTuple = b as typeof a;
            if (a.elements.length !== bTuple.elements.length) return false;
            return a.elements.every((el, i) =>
                typesEqual(el, bTuple.elements[i]!)
            );
        }

        case 'fn': {
            const bFn = b as typeof a;
            if (a.params.length !== bFn.params.length) return false;
            return (
                a.params.every((p, i) => typesEqual(p, bFn.params[i]!)) &&
                typesEqual(a.returnType, bFn.returnType)
            );
        }

        case 'struct':
            return a.name === (b as typeof a).name;

        case 'generic':
            return a.name === (b as typeof a).name;

        case 'nullable':
            return typesEqual(a.inner, (b as typeof a).inner);

        case 'null':
            return true;

        default:
            return false;
    }
}

export function expectNumeric(
    type: OrbType,
    node: any,
    ctx: AnalyzerContext
): boolean {
    if (type.kind !== 'int' && type.kind !== 'float') {
        ctx.reportError(`Expected numeric type`, node);
        return false;
    }
    return true;
}

export function isAssignable(from: OrbType, to: OrbType): boolean {
    if (to.kind === 'nullable') {
        // non-null value can flow into a nullable slot
        if (from.kind === 'null') return true;
        return typesEqual(from, to.inner) || isAssignable(from, to.inner);
    }
    return typesEqual(from, to);
}
