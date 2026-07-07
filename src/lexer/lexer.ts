import { KEYWORDS, SINGLE_CHAR_SYMBOLS } from '../constants';
import { globalErrorBucket } from '../globals';
import {
    Add,
    alphanum,
    alphCap,
    aplhaAll,
    Arrow,
    CloseBrace,
    CloseBracket,
    CloseParen,
    Colon,
    Comma,
    Decrement,
    digit,
    digitAndDot,
    Divide,
    Dot,
    DotDot,
    DotDotEquals,
    DoubleEquals,
    Equals,
    FatArrow,
    GreaterThan,
    GreaterThanEquals,
    Increment,
    LessThan,
    LessThanEquals,
    LogicalAnd,
    LogicalNot,
    LogicalOr,
    MinusEquals,
    Modulo,
    Multiply,
    NotEquals,
    OpenBrace,
    OpenBracket,
    OpenParen,
    PercentEquals,
    PlusEquals,
    QuestionMark,
    Semicolon,
    SlashEquals,
    StarEquals,
    Subtract,
    symbolStart,
    Underscore,
    whitespace,
} from '../regex';
import { editDistance } from '../utility/distanceAutoCorrect';
import { TokenType, type Token } from './token';

import type { OrbitError } from '../errors/errorList';
import { ErrorType } from '../errors/errorTypes';

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

    private isEnd(): boolean {
        return this.cursor < this.source.length ? false : true;
    }

    public nextToken(): Token {
        // skip whitespace before every token, same as before
        while (!this.isEnd() && whitespace.test(this.peek())) {
            this.next();
        }

        if (this.isEnd()) {
            return {
                type: TokenType.EOF,
                value: '',
                line: this.line,
                col: this.col,
            };
        }

        const char = this.peek();

        if (char === '"' || char === "'") {
            return this.readLiteralString();
        }

        if (aplhaAll.test(char)) {
            return this.readIdentifierString();
        }

        if (digit.test(char)) {
            return this.readNumber();
        }

        if (char === '/' && this.peekNext() === '/') {
            return this.readSingleLineComment();
        }

        if (symbolStart.test(char)) {
            return this.readSymbols();
        }

        throw new Error(
            `Unexpected character '${char}' at line ${this.line}, col ${this.col}`
        );
    }
    private readSingleLineComment(): Token {
        while (!this.isEnd() && this.peek() !== '\n') {
            this.next();
        }
        return this.nextToken();
    }

    private readLiteralString(): Token {
        let literal = '';
        const startLine = this.line;
        const startCol = this.col;

        // 1. Capture whether this string started with " or '
        const quoteChar = this.peek();
        this.next(); // consume opening quote

        // 2. Loop until we hit the matching closing quote
        while (this.peek() !== quoteChar) {
            if (this.isEnd()) break;
            literal += this.peek();
            this.next();
        }

        // 3. Cleanly consume the matching closing quote
        if (!this.isEnd() && this.peek() === quoteChar) {
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
    private readIdentifierString(): Token {
        let identifier = '';
        const startLine = this.line;
        const startCol = this.col;

        while (!this.isEnd() && alphanum.test(this.peek())) {
            identifier += this.peek();
            this.next();
        }

        const keyword = this.isKeyword(identifier, this.line, this.col);

        if (keyword) {
            const token: Token = {
                type: keyword.type,
                value: keyword.value,
                line: startLine,
                col: startCol,
            };

            return token;
        }

        const token: Token = {
            type: TokenType.Identifier,
            value: identifier,
            line: startLine,
            col: startCol,
        };

        return token;
    }

    private isKeyword(
        str: string,
        line: number,
        col: number
    ): { type: TokenType; value: string } | null {
        const word = KEYWORDS[str];

        if (!word) {
            for (const key in KEYWORDS) {
                if (!Object.hasOwn(KEYWORDS, key)) continue;

                const keyword = KEYWORDS[key]!;
                const { passesConfidence } = editDistance(str, keyword);

                if (passesConfidence) {
                    const error: OrbitError = {
                        type: ErrorType.ReferenceError,
                        message: `Did you mean ${keyword}?`,
                        line: line,
                        col: col,
                        length: str.length,
                    };
                    // globalErrorBucket.add(error);
                }
            }
            return null;
        }

        if (['true', 'false'].includes(word)) {
            return { type: TokenType.BoolLiteral, value: word };
        }

        return { type: word, value: word };
    }

    private readNumber(): Token {
        let number = '';
        const startLine = this.line;
        const startCol = this.col;
        let tokenType = TokenType.IntLiteral;

        while (!this.isEnd() && digit.test(this.peek())) {
            number += this.peek();
            this.next();
        }

        // only treat '.' as a decimal point if it's NOT the start of a range operator (.. or ..=)
        if (this.peek() === '.' && this.peekNext() !== '.') {
            tokenType = TokenType.FloatLiteral;
            number += this.peek();
            this.next();

            while (!this.isEnd() && digit.test(this.peek())) {
                number += this.peek();
                this.next();
            }
        }

        const token: Token = {
            type: tokenType,
            value: number,
            line: startLine,
            col: startCol,
        };

        return token;
    }

    private peekNext(): string {
        return this.cursor + 1 < this.source.length
            ? this.source[this.cursor + 1]!
            : '';
    }

    private readSymbols(): Token {
        let symbol = '';
        const startLine = this.line;
        const startCol = this.col;

        const first = this.peek();
        symbol += first;
        this.next();

        if (!SINGLE_CHAR_SYMBOLS.has(first)) {
            // only keep consuming if this character is one that CAN combine with more
            while (
                !this.isEnd() &&
                symbolStart.test(this.peek()) &&
                !SINGLE_CHAR_SYMBOLS.has(this.peek())
            ) {
                symbol += this.peek();
                this.next();
            }
        }

        let type: TokenType | null = null;

        if (DotDotEquals.test(symbol)) type = TokenType.DotDotEquals;
        else if (Arrow.test(symbol)) type = TokenType.Arrow;
        else if (FatArrow.test(symbol)) type = TokenType.FatArrow;
        else if (DotDot.test(symbol)) type = TokenType.DotDot;
        else if (PlusEquals.test(symbol)) type = TokenType.PlusEquals;
        else if (MinusEquals.test(symbol)) type = TokenType.MinusEquals;
        else if (StarEquals.test(symbol)) type = TokenType.StarEquals;
        else if (SlashEquals.test(symbol)) type = TokenType.SlashEquals;
        else if (PercentEquals.test(symbol)) type = TokenType.PercentEquals;
        else if (LogicalAnd.test(symbol)) type = TokenType.LogicalAnd;
        else if (LogicalOr.test(symbol)) type = TokenType.LogicalOr;
        else if (DoubleEquals.test(symbol)) type = TokenType.DoubleEquals;
        else if (NotEquals.test(symbol)) type = TokenType.NotEquals;
        else if (LessThanEquals.test(symbol)) type = TokenType.LessThanEquals;
        else if (GreaterThanEquals.test(symbol))
            type = TokenType.GreaterThanEquals;
        else if (Increment.test(symbol)) type = TokenType.Increment;
        else if (Decrement.test(symbol)) type = TokenType.Decrement;
        else if (Dot.test(symbol)) type = TokenType.Dot;
        else if (OpenBracket.test(symbol)) type = TokenType.OpenBracket;
        else if (CloseBracket.test(symbol)) type = TokenType.CloseBracket;
        else if (Colon.test(symbol)) type = TokenType.Colon;
        else if (OpenBrace.test(symbol)) type = TokenType.OpenBrace;
        else if (CloseBrace.test(symbol)) type = TokenType.CloseBrace;
        else if (OpenParen.test(symbol)) type = TokenType.OpenParen;
        else if (CloseParen.test(symbol)) type = TokenType.CloseParen;
        else if (Comma.test(symbol)) type = TokenType.Comma;
        else if (Semicolon.test(symbol)) type = TokenType.Semicolon;
        else if (Equals.test(symbol)) type = TokenType.Equals;
        else if (Add.test(symbol)) type = TokenType.Add;
        else if (Subtract.test(symbol)) type = TokenType.Subtract;
        else if (Multiply.test(symbol)) type = TokenType.Multiply;
        else if (Divide.test(symbol)) type = TokenType.Divide;
        else if (Modulo.test(symbol)) type = TokenType.Modulo;
        else if (LessThan.test(symbol)) type = TokenType.LessThan;
        else if (GreaterThan.test(symbol)) type = TokenType.GreaterThan;
        else if (LogicalNot.test(symbol)) type = TokenType.LogicalNot;
        else if (QuestionMark.test(symbol)) type = TokenType.QuestionMark;
        else if (Underscore.test(symbol)) type = TokenType.Underscore;

        if (!type) {
            const error: OrbitError = {
                type: ErrorType.SyntaxError, // <- check this exists in ErrorType; guessing based on isKeyword's ReferenceError usage
                message: `Unknown symbol: '${symbol}'`,
                line: startLine,
                col: startCol,
                length: symbol.length,
            };
            globalErrorBucket.add(error);

            type = TokenType.Error; // <- check this exists in your TokenType enum
        }

        const token: Token = {
            type,
            value: symbol,
            line: startLine,
            col: startCol,
        };

        return token;
    }
}
