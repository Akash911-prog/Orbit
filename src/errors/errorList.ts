import { ErrorType } from './errorTypes';

export type OrbitError = {
    type: ErrorType;
    message: string;
    line: number;
    col: number;
    length?: number; // how many chars to underline; defaults to 1 if omitted
};

function formatError(error: OrbitError, source: string): string {
    const lines = source.split('\n');
    const sourceLine = lines[error.line - 1] ?? '';
    const underlineLength = error.length ?? 1;
    const pointer =
        ' '.repeat(Math.max(error.col - 1, 0)) + '^'.repeat(underlineLength);

    return [
        `error: ${error.message}`,
        `  --> line ${error.line}:${error.col}`,
        `   |`,
        `${error.line} | ${sourceLine}`,
        `   | ${pointer}`,
    ].join('\n');
}

export class ErrorBucket {
    public errors: OrbitError[] = [];
    private source: string;

    constructor(source: string) {
        this.source = source;
    }

    add(error: OrbitError): void {
        this.errors.push(error);
    }

    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    // logs everything formatted Rust-style, then empties the bucket —
    // this is the terminal step of one compile cycle, called from `finally`
    showAll(): void {
        for (const error of this.errors) {
            console.log(formatError(error, this.source));
            console.log(); // blank line between errors
        }
        this.errors = [];
    }

    clear(): void {
        this.errors = [];
    }
}

export function createGlobalErrorBucket(source: string): ErrorBucket {
    return new ErrorBucket(source);
}
