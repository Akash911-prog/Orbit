// tests/analyzer/hoisting.test.ts
import { test, expect, describe } from 'bun:test';
import { runAnalyzer, expectNoErrors } from './helpers';

describe('global variable resolution ordering', () => {
    test("function declared before a global can see the global's resolved type", () => {
        const { errors } = runAnalyzer(`
            fn useGlobal(): int {
                return counter + 1;
            }
            let counter = 5;
            orbit main { }
        `);
        expectNoErrors(errors);
    });

    test('global referencing a later global is an error (no dependency graph in MVP)', () => {
        const { errors } = runAnalyzer(`
            let a = b + 1;
            let b = 5;
            orbit main { }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('duplicate global declaration is an error', () => {
        const { errors } = runAnalyzer(`
            let x = 5;
            let x = 10;
            orbit main { }
        `);
        expect(errors.length).toBeGreaterThan(0);
    });
});
