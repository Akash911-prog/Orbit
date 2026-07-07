// tests/analyzer/statements.test.ts
import { test, expect, describe } from 'bun:test';
import { runAnalyzer, expectNoErrors } from './helpers';

describe('IfStatement', () => {
    test('non-bool condition is an error', () => {
        const { errors } = runAnalyzer(`orbit main { if 5 { } }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('valid if/else with nested else-if, no errors', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let x = 5;
                if x < 3 { } else if x < 10 { } else { }
            }
        `);
        expectNoErrors(errors);
    });

    test('scope opened by if-block does not leak into outer scope', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                if true { let inner = 5; }
                let x = inner; // should be undefined here
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('WhileStatement / loop depth', () => {
    test('break inside while is valid', () => {
        const { errors } = runAnalyzer(`orbit main { while true { break; } }`);
        expectNoErrors(errors);
    });

    test('break outside any loop is an error', () => {
        const { errors } = runAnalyzer(`orbit main { break; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('continue outside any loop is an error', () => {
        const { errors } = runAnalyzer(`orbit main { continue; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('loopDepth correctly restores after loop exits (break after loop is still an error)', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                while true { break; }
                break;
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('nested loops: break/continue valid at any depth', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                while true {
                    while true {
                        break;
                    }
                    continue;
                }
            }
        `);
        expectNoErrors(errors);
    });
});

describe('ReturnStatement', () => {
    test('return outside a function is an error', () => {
        const { errors } = runAnalyzer(`orbit main { return 5; }`);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('return type matching function signature, no error', () => {
        const { errors } = runAnalyzer(`
            fn add(a: int, b: int): int {
                return a + b;
            }
            orbit main { }
        `);
        expectNoErrors(errors);
    });

    test('return type mismatch is an error', () => {
        const { errors } = runAnalyzer(`
            fn add(a: int, b: int): int {
                return "wrong";
            }
            orbit main { }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('Assignment', () => {
    test('assigning to immutable let is an error', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                let x = 5;
                x = 10;
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('assigning to mutable var is valid', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                var x = 5;
                x = 10;
            }
        `);
        expectNoErrors(errors);
    });

    test('assigning mismatched type is an error', () => {
        const { errors } = runAnalyzer(`
            orbit main {
                var x = 5;
                x = "hello";
            }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});
