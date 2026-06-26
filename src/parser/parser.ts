import { ErrorType } from '../errors/errorTypes';
import { globalErrorBucket } from '../globals';
import type { Lexer } from '../lexer/lexer';
import { TokenType, type Token } from '../lexer/token';
import type {
    Assignment,
    Block,
    Expression,
    ExpressionStatement,
    Program,
    Statement,
    TopLevelDeclaration,
    TypeNode,
    VariableDecl,
} from './nodeTypes';

export class Parser {
    private current: Token;
    private lookahead: Token[] = [];
    private lexer: Lexer;

    constructor(lexer: Lexer) {
        this.lexer = lexer;
        this.current = this.lexer.nextToken();
    }

    private peek(offset: number): Token {
        // offset 0 is the token after current and offset 1 is the token after-after current
        if (this.lookahead.length === 0) {
            this.lookahead.push(this.lexer.nextToken());
            this.lookahead.push(this.lexer.nextToken());
        }

        return this.lookahead[offset]!;
    }

    private consume(): Token {
        const prev = this.current;
        if (!this.lookahead[0]) {
            this.current = this.lexer.nextToken();
            return prev;
        }
        this.current = this.lookahead[0];
        this.lookahead.shift();
        this.lookahead.push(this.lexer.nextToken());
        return prev;
    }

    private expect(tokenTypes: TokenType[]): Token {
        if (tokenTypes.includes(this.current.type)) {
            globalErrorBucket.add({
                type: ErrorType.SyntaxError,
                message: `Expected ${tokenTypes.forEach((type) => console.log(type))} but found ${this.current.type}`,
                line: this.current.line,
                col: this.current.col,
                length: this.current.value.length,
            });
        }
        return this.consume();
    }

    parseProgram(): Program {
        const declarations: TopLevelDeclaration[] = [];
        while (this.current.type !== TokenType.EOF) {
            declarations.push(this.parseTopLevelDeclaration());
        }
        return { type: 'Program', declarations };
    }

    private parseTopLevelDeclaration(): TopLevelDeclaration {
        switch (this.current.type) {
            case TokenType.KeywordLet:
            case TokenType.KeywordVar:
                return this.parseVariableDecl();
            case TokenType.KeywordFn:
                return this.parseFunctionDecl();
            case TokenType.KeywordStruct:
                return this.parseStructDecl();
            case TokenType.KeywordNova:
                return this.parseNovaDecl();
            case TokenType.KeywordOrbit:
                return this.parseRootOrbitDecl();
            default:
                throw new Error('Out of bound');
        }
    }

    private parseVariableDecl(): VariableDecl {
        const kind = this.expect([TokenType.KeywordLet, TokenType.KeywordVar])
            .value as 'let' | 'var';
        const name = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Colon]);
        const type: TypeNode = this.parseType();
        this.expect([TokenType.Equals]);
        const expression: Expression = this.parseExpression();

        return {
            type: 'VariableDecl',
            kind: kind,
            name: name,
            varType: type,
            initializer: expression,
        };
    }

    private parseType(): TypeNode {
        throw new Error('Method not implemented.');
    }

    private parseStructDecl(): TopLevelDeclaration {
        throw new Error('Method not implemented.');
    }

    private parseNovaDecl(): TopLevelDeclaration {
        throw new Error('Method not implemented.');
    }

    private parseRootOrbitDecl(): TopLevelDeclaration {
        this.expect([TokenType.KeywordOrbit]);
        this.expect([TokenType.KeywordMain]);

        const block = this.parseBlock();

        return { type: 'RootOrbitDecl', body: block };
    }

    private parseFunctionDecl(): TopLevelDeclaration {
        throw new Error('Method not implemented.');
    }

    private parseBlock(): Block {
        const statements: Statement[] = [];
        this.expect([TokenType.OpenBrace]);

        while (this.current.type !== TokenType.CloseBrace) {
            statements.push(this.parseStatement());
        }
        this.expect([TokenType.CloseBrace]);
        return { type: 'Block', statements: statements };
    }

    private parseStatement(): Statement {
        switch (this.current.type) {
            case TokenType.KeywordLet:
            case TokenType.KeywordVar:
                return this.parseVariableDecl();

            case TokenType.KeywordIf:
                return this.parseIfStatement();

            case TokenType.KeywordFor:
                return this.parseForStatement();

            case TokenType.KeywordWhile:
                return this.parseWhileStatement();

            case TokenType.KeywordLoop:
                return this.parseLoopStatement();

            case TokenType.KeywordMatch:
                return this.parseMatchStatement();

            case TokenType.KeywordOrbit:
                return this.parseOrbitBlock();

            case TokenType.KeywordDrift:
                return this.parseDriftStatement();

            case TokenType.KeywordDecay:
                return this.parseDecayBlock();

            case TokenType.KeywordFire:
                return this.parseFireStatement();

            case TokenType.KeywordReturn:
                return this.parseReturnStatement();

            case TokenType.KeywordBreak:
                return this.parseBreakStatement();

            case TokenType.KeywordContinue:
                return this.parseContinueStatement();

            case TokenType.Identifier:
                // Assignment vs ExpressionStatement both start with Identifier —
                // needs lookahead/backtracking to disambiguate (see note above)
                return this.parseIdentifierStartedStatement();

            default:
                return this.parseExpressionStatement();
        }
    }

    parseExpressionStatement(): Statement {
        throw new Error('Method not implemented.');
    }

    parseIfStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseForStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseWhileStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseLoopStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseMatchStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseOrbitBlock(): Statement {
        throw new Error('Method not implemented.');
    }
    parseDriftStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseDecayBlock(): Statement {
        throw new Error('Method not implemented.');
    }
    parseFireStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseReturnStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseBreakStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    parseContinueStatement(): Statement {
        throw new Error('Method not implemented.');
    }

    private parseIdentifierStartedStatement():
        | Assignment
        | ExpressionStatement {
        const expr = this.parseExpression();

        if (this.current.type === TokenType.Equals) {
            this.consume(); // eat "="
            const value = this.parseExpression();
            const target = this.expressionToAssignmentTarget(expr);
            return { type: 'Assignment', target, value };
        }

        return { type: 'ExpressionStatement', expression: expr };
    }

    private expressionToAssignmentTarget(expr: Expression): string[] {
        // Walk a MemberAccess/Identifier chain back into a flat string[].
        // e.g. Identifier("x") -> ["x"]
        //      MemberAccess(MemberAccess(Identifier("x"), "foo"), "bar") -> ["x", "foo", "bar"]
        const parts: string[] = [];
        let current: Expression = expr;

        while (current.type === 'MemberAccess') {
            parts.unshift(current.property);
            current = current.object;
        }

        if (current.type === 'Identifier') {
            parts.unshift(current.name);
            return parts;
        }

        // Got here means the LHS wasn't a valid assignment target —
        // e.g. someone wrote `foo() = 5` or `1 + 2 = x`.
        // Report a syntax error via your ErrorBucket here.
        globalErrorBucket.add({
            type: ErrorType.SyntaxError,
            message: 'AssignmentError: Invalid Assignment',
            line: this.current.line,
            col: this.current.col,
        });
        throw new Error('Invalid assignment target');
    }

    parseExpression(): Expression {
        throw new Error('Method not implemented.');
    }
}
