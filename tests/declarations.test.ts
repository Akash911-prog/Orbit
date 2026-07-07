// tests/analyzer/declarations.test.ts
import { test, expect, describe } from 'bun:test';
import { runAnalyzer, findNode, expectNoErrors } from './helpers';

describe('VariableDecl', () => {
    test('inferred type matches initializer', () => {
        const { decoratedAst, errors } = runAnalyzer(
            `orbit main { let x = 5; }`
        );
        expectNoErrors(errors);
        const decl = findNode(decoratedAst, 'VariableDecl');
        expect(decl.cTypeString ?? decl.resolvedType?.kind).toBeTruthy();
    });

    test('explicit type mismatch with initializer is an error', () => {
        const { errors } = runAnalyzer(`orbit main { let x: str = 5; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('duplicate declaration in same scope is an error', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let x = 5;
                let x = 10;
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('shadowing in a nested scope is allowed', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let x = 5;
                if true {
                    let x = "shadowed";
                }
            }
        `);
        expectNoErrors(errors);
    });
});

describe('FunctionDecl', () => {
    test('forward reference to a function declared later works (hoisting)', () => {
        const { errors } = runAnalyzer(`
            fn caller(): int {
                return callee();
            }
            fn callee(): int {
                return 5;
            }
            orbit main { }
        `);
        expectNoErrors(errors);
    });

    test('duplicate function name is an error', () => {
        const { errors } = runAnalyzer(`
            fn foo(): int { return 1; }
            fn foo(): int { return 2; }
            orbit main { }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('redefining a builtin function is an error', () => {
        const { errors } = runAnalyzer(`
            fn print(x: str): void { }
            orbit main { }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('argument count mismatch on call is an error', () => {
        const { errors } = runAnalyzer(`
            fn add(a: int, b: int): int { return a + b; }
            orbit main { let x = add(1); }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('argument type mismatch on call is an error', () => {
        const { errors } = runAnalyzer(`
            fn add(a: int, b: int): int { return a + b; }
            orbit main { let x = add(1, "two"); }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('nested function declared inside a block is valid', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                fn inner(): int { return 5; }
                let x = inner();
            }
        `);
        expectNoErrors(errors);
    });
});

describe('StructDecl', () => {
    test('struct with fields, valid member access', () => {
        const { errors } = runAnalyzer(`
            struct Point {
                let x: int;
                let y: int;
            }
            orbit main {
                let p = Point { x: 1, y: 2 };
                let a = p.x;
            }
        `);
        expectNoErrors(errors);
    });

    test('accessing an undefined field is an error', () => {
        const { errors } = runAnalyzer(`
            struct Point {
                let x: int;
                let y: int;
            }
            orbit main {
                let p = Point { x: 1, y: 2 };
                let a = p.z;
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('method call with explicit self resolves return type', () => {
        const { errors } = runAnalyzer(`
            struct Point {
                let x: int;
                let y: int;
                fn getX(self: Point): int {
                    return self.x;
                }
            }
            orbit main {
                let p = Point { x: 1, y: 2 };
                let a = p.getX();
            }
        `);
        expectNoErrors(errors);
    });

    test('mutual struct references work via hoisting', () => {
        const { errors } = runAnalyzer(`
            struct A {
                let b: B;
            }
            struct B {
                let a: A;
            }
            orbit main { }
        `);
        expectNoErrors(errors);
    });
});
