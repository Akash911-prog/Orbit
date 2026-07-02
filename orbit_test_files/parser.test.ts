import { describe, test, expect, beforeEach } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ADJUST THESE IMPORT PATHS to match your actual project structure
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { globalErrorBucket, initiateGlobals } from '../src/globals';
import { ErrorType } from '../src/errors/errorTypes';

const VALID_DIR = join(import.meta.dir, 'valid');

function parseSource(source: string) {
    initiateGlobals(source);
    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    return parser.parseProgram();
}

describe('Valid syntax fixtures (.orbit files)', () => {
    const files = readdirSync(VALID_DIR).filter((f) => f.endsWith('.orbit'));

    for (const file of files) {
        test(`${file} parses without throwing or reporting errors`, () => {
            const source = readFileSync(join(VALID_DIR, file), 'utf-8');

            let program;
            let thrown: unknown = null;

            try {
                program = parseSource(source);
            } catch (e) {
                thrown = e;
            }

            if (thrown) {
                console.error(`\n--- ${file} threw ---`);
                console.error(thrown);
            }

            expect(thrown).toBeNull();
            expect(program).toBeDefined();
            expect(program?.type).toBe('Program');

            if (globalErrorBucket.errors.length > 0) {
                console.error(`\n--- ${file} reported errors ---`);
                console.dir(globalErrorBucket.errors, { depth: null });
            }
            expect(globalErrorBucket.errors.length).toBe(0);
        });
    }
});

describe('Invalid syntax — expected errors', () => {
    beforeEach(() => {
        globalErrorBucket.errors = [];
    });

    test('missing semicolon after variable decl', () => {
        const source = `
            orbit main {
                let x: int = 5
                print(x);
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        // ADJUST: if you move to error-recovery instead of throwing, switch this to:
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('missing semicolon after expression statement', () => {
        const source = `
            orbit main {
                print(x)
                print(y);
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('invalid assignment target — call expression on LHS', () => {
        const source = `
            orbit main {
                foo() = 5;
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('invalid assignment target — literal on LHS', () => {
        const source = `
            orbit main {
                1 + 2 = x;
            }
        `;

        expect(() => parseSource(source)).toThrow();
    });

    test('missing closing brace on block', () => {
        const source = `
            orbit main {
                let x: int = 5;
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('missing closing paren on function call', () => {
        const source = `
            orbit main {
                print(x;
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('if without condition', () => {
        const source = `
            orbit main {
                if {
                    print(1);
                }
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('unclosed string literal', () => {
        // NOTE: depending on your lexer's behavior on unterminated strings,
        // this may need adjusting — check what readLiteralString does at EOF
        const source = `
            orbit main {
                let x: str = "unterminated;
            }
        `;

        // this might not throw at the parser level if your lexer just
        // silently consumes to EOF — flagging this as worth checking by hand
        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });

    test('unknown symbol / garbage token', () => {
        const source = `
            orbit main {
                let x: int = 5 @ 3;
            }
        `;

        expect(() => parseSource(source)).toThrow();
    });

    test('struct init with malformed field (missing colon)', () => {
        const source = `
            orbit main {
                let p: Point = Point { x 1 };
            }
        `;

        // expect(() => parseSource(source)).toThrow();
        parseSource(source);
        expect(globalErrorBucket.errors.length).toBeGreaterThan(0);
        expect(globalErrorBucket.errors[0].type).toBe(ErrorType.SyntaxError);
    });
});
