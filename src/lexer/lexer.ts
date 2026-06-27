import { KEYWORDS } from '../constants';
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

    nextToken(): Token {
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

        if (char === '"') {
            return this.readLiteralString();
        }

        if (aplhaAll.test(char)) {
            return this.readIdentifierString();
        }

        if (digit.test(char)) {
            return this.readNumber();
        }

        if (symbolStart.test(char)) {
            return this.readSymbols();
        }

        // TODO: you'll need a branch here for operators/punctuation
        // (+, -, {, }, (, ), etc) — your current tokenize() doesn't
        // handle these yet either, so this isn't a regression, just
        // flagging it's the next thing you'll hit.
        throw new Error(
            `Unexpected character '${char}' at line ${this.line}, col ${this.col}`
        );
    }

    private readLiteralString(): Token {
        let literal = '';
        const startLine = this.line;
        const startCol = this.col;
        this.next(); // consume opening "

        while (this.peek() !== '"') {
            literal += this.peek();
            if (this.isEnd()) break;
            this.next();
        }

        if (!this.isEnd()) {
            this.next(); // consume closing "
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
                    globalErrorBucket.add(error);
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
        let sawDot = false;

        while (!this.isEnd() && digitAndDot.test(this.peek())) {
            const char = this.peek();

            if (char === '.') {
                if (sawDot) break; // second dot — stop, don't consume it
                sawDot = true;
                tokenType = TokenType.FloatLiteral;
            }

            number += char;
            this.next();
        }

        const token: Token = {
            type: tokenType,
            value: number,
            line: startLine,
            col: startCol,
        };

        return token;
    }

    private readSymbols(): Token {
        let symbol = '';
        const startLine = this.line;
        const startCol = this.col;
        while (!this.isEnd() && symbolStart.test(this.peek())) {
            symbol += this.peek();
            this.next();
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
