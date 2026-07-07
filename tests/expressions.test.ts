// tests/analyzer/expressions.test.ts
import { test, expect, describe } from 'bun:test';
import { runAnalyzer, findNode, expectNoErrors } from './helpers';

describe('literals', () => {
    test('int literal resolves to int', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = 5; }`
        );
        expectNoErrors(errors);
        const lit = findNode(decoratedAst, 'IntLiteral');
        expect(lit.resolvedType.kind).toBe('int');
    });

    test('null literal resolves to null, not unknown', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x: int? = null; }`
        );
        expectNoErrors(errors);
        const lit = findNode(decoratedAst, 'NullLiteral');
        expect(lit.resolvedType.kind).toBe('null');
    });
});

describe('BinaryExpr', () => {
    test('int + int resolves to int, no error', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = 5 + 3; }`
        );
        expectNoErrors(errors);
        const bin = findNode(decoratedAst, 'BinaryExpr');
        expect(bin.resolvedType.kind).toBe('int');
        expect(bin.isStringConcat).toBeFalsy();
    });

    test('str + str resolves to str and is flagged for concat codegen', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = "a" + "b"; }`
        );
        expectNoErrors(errors);
        const bin = findNode(decoratedAst, 'BinaryExpr');
        expect(bin.resolvedType.kind).toBe('str');
        expect(bin.isStringConcat).toBe(true);
    });

    test('bool + int is a type error', () => {
        const { errors } = runAnalyzer(`orbit main { let x = true + 3; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('comparison operators always resolve to bool', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = 5 < 3; }`
        );
        expectNoErrors(errors);
        const bin = findNode(decoratedAst, 'BinaryExpr');
        expect(bin.resolvedType.kind).toBe('bool');
    });

    test('== between mismatched types reports an error', () => {
        const { errors } = runAnalyzer(`orbit main { let x = 5 == "5"; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('logical && requires bool operands', () => {
        const { errors } = runAnalyzer(`orbit main { let x = 1 && 2; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('error carries correct line/col of the offending expression', () => {
        const { errors } = runAnalyzer(`orbit main {
    let x = true + 3;
}`);
        expect(errors[0].line).toBe(2);
    });
});

describe('UnaryExpr', () => {
    test('! requires bool operand, resolves to bool', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = !true; }`
        );
        expectNoErrors(errors);
        expect(findNode(decoratedAst, 'UnaryExpr').resolvedType.kind).toBe(
            'bool'
        );
    });

    test('- on int preserves int type', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = -5; }`
        );
        expectNoErrors(errors);
        expect(findNode(decoratedAst, 'UnaryExpr').resolvedType.kind).toBe(
            'int'
        );
    });

    test('! on non-bool is an error', () => {
        const { errors } = runAnalyzer(`orbit main { let x = !5; }`);
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('NullCheckExpr', () => {
    test('? on nullable resolves to bool, no error', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let y: int? = null;
                if y? { }
            }
        `);
        expectNoErrors(errors);
    });

    test('? on non-nullable is an error', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let y: int = 5;
                if y? { }
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('narrowing: y resolves as non-nullable inside the if-block', () => {
        const { decoratedAst, errors } = runAnalyzer(`
            orbit main {
                let y: int? = null;
                if y? {
                    let z = y + 1;
                }
            }
        `);
        expectNoErrors(errors); // would fail if y is still typed nullable<int> inside the block
        const idents = findNode(decoratedAst, 'Identifier', 1); // the `y` inside y + 1
        expect(idents.resolvedType.kind).toBe('int');
    });
});

describe('Identifier', () => {
    test('undefined identifier reports an error', () => {
        const { errors } = runAnalyzer(`orbit main { let x = y; }`);
        expect(errors.length).toBeGreaterThan(0);
    });
});
