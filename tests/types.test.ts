// tests/analyzer/types.test.ts
import { test, expect, describe } from 'bun:test';
import { OrbTypes } from '../src/types';
import { isAssignable, typesEqual } from '../src/analyzer/helper';

describe('typesEqual', () => {
    test('primitives of same kind are equal', () => {
        expect(typesEqual(OrbTypes.int(), OrbTypes.int())).toBe(true);
    });

    test('different primitive kinds are not equal', () => {
        expect(typesEqual(OrbTypes.int(), OrbTypes.float())).toBe(false);
    });

    test('unknown is equal to anything (error-recovery suppression)', () => {
        expect(typesEqual(OrbTypes.unknown(), OrbTypes.int())).toBe(true);
        expect(typesEqual(OrbTypes.str(), OrbTypes.unknown())).toBe(true);
    });

    test('null is only equal to null', () => {
        expect(typesEqual(OrbTypes.null(), OrbTypes.null())).toBe(true);
        expect(typesEqual(OrbTypes.null(), OrbTypes.int())).toBe(false);
    });

    test('array types compare structurally by element', () => {
        expect(
            typesEqual(
                OrbTypes.array(OrbTypes.int()),
                OrbTypes.array(OrbTypes.int())
            )
        ).toBe(true);
        expect(
            typesEqual(
                OrbTypes.array(OrbTypes.int()),
                OrbTypes.array(OrbTypes.str())
            )
        ).toBe(false);
    });

    test('map types compare key and value structurally', () => {
        const a = OrbTypes.map(OrbTypes.str(), OrbTypes.int());
        const b = OrbTypes.map(OrbTypes.str(), OrbTypes.int());
        const c = OrbTypes.map(OrbTypes.str(), OrbTypes.float());
        expect(typesEqual(a, b)).toBe(true);
        expect(typesEqual(a, c)).toBe(false);
    });

    test('tuple types compare length and each element', () => {
        const a = OrbTypes.tuple([OrbTypes.int(), OrbTypes.str()]);
        const b = OrbTypes.tuple([OrbTypes.int(), OrbTypes.str()]);
        const c = OrbTypes.tuple([OrbTypes.int()]);
        expect(typesEqual(a, b)).toBe(true);
        expect(typesEqual(a, c)).toBe(false);
    });

    test('struct types compare by name only', () => {
        expect(
            typesEqual(OrbTypes.struct('Point'), OrbTypes.struct('Point'))
        ).toBe(true);
        expect(
            typesEqual(OrbTypes.struct('Point'), OrbTypes.struct('Vec2'))
        ).toBe(false);
    });

    test('nullable types compare inner types', () => {
        expect(
            typesEqual(
                OrbTypes.nullable(OrbTypes.int()),
                OrbTypes.nullable(OrbTypes.int())
            )
        ).toBe(true);
        expect(
            typesEqual(OrbTypes.nullable(OrbTypes.int()), OrbTypes.int())
        ).toBe(false);
    });

    test('fn types compare params and return type', () => {
        const a = OrbTypes.fn([OrbTypes.int()], OrbTypes.bool());
        const b = OrbTypes.fn([OrbTypes.int()], OrbTypes.bool());
        const c = OrbTypes.fn([OrbTypes.str()], OrbTypes.bool());
        expect(typesEqual(a, b)).toBe(true);
        expect(typesEqual(a, c)).toBe(false);
    });
});

describe('isAssignable', () => {
    test('same type is assignable', () => {
        expect(isAssignable(OrbTypes.int(), OrbTypes.int())).toBe(true);
    });

    test('different types are not assignable', () => {
        expect(isAssignable(OrbTypes.int(), OrbTypes.str())).toBe(false);
    });

    test('plain value is assignable into a matching nullable slot', () => {
        expect(
            isAssignable(OrbTypes.int(), OrbTypes.nullable(OrbTypes.int()))
        ).toBe(true);
    });

    test('null literal is assignable into any nullable slot', () => {
        expect(
            isAssignable(OrbTypes.null(), OrbTypes.nullable(OrbTypes.int()))
        ).toBe(true);
        expect(
            isAssignable(OrbTypes.null(), OrbTypes.nullable(OrbTypes.str()))
        ).toBe(true);
    });

    test('null literal is NOT assignable into a non-nullable slot', () => {
        expect(isAssignable(OrbTypes.null(), OrbTypes.int())).toBe(false);
    });

    test('nullable is not assignable into a non-nullable slot', () => {
        expect(
            isAssignable(OrbTypes.nullable(OrbTypes.int()), OrbTypes.int())
        ).toBe(false);
    });

    test('mismatched inner type in nullable slot is rejected', () => {
        expect(
            isAssignable(OrbTypes.str(), OrbTypes.nullable(OrbTypes.int()))
        ).toBe(false);
    });
});
