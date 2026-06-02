import { alphCap, whitespace } from '../regex';
import { TokenType, type Token } from './token';

export class Lexer {
    private source = '';
    private cursor = 0;
    private line = 1;
    private col = 1;

    constructor(source: string) {
        this.source = source;
    }

    private peek(): string {
        return this.cursor < this.source.length
            ? this.source[this.cursor]!
            : '';
    }

    private next(): string {
        const char = this.source[this.cursor] as string;
        if (char === '\n') {
            this.line += 1;
            this.col = 1;
        } else {
            this.col += 1;
        }
        this.cursor = this.cursor + 1;
        return char;
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];

        while (this.cursor < this.source.length) {
            const char = this.peek();

            if (whitespace.test(char)) {
                this.next();
                continue;
            }

            if (char === '"') {
                tokens.push(this.readLiteralString());
                break;
            }
        }

        return tokens;
    }

    private readLiteralString(): Token {
        let literal = '';
        const startLine = this.line;
        const startCol = this.col;
        this.next();

        while (this.peek() !== '"') {
            literal += this.peek();
            this.next();
        }
        const token: Token = {
            type: TokenType.StrLiteral,
            value: literal,
            line: startLine,
            col: startCol,
        };

        return token;
    }
}
