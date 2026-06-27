import { ErrorType } from '../errors/errorTypes';
import { globalErrorBucket } from '../globals';
import type { Lexer } from '../lexer/lexer';
import { TokenType, type Token } from '../lexer/token';
import type {
    Assignment,
    Block,
    DriftStatement,
    Expression,
    ExpressionStatement,
    ForStatement,
    IfStatement,
    Literal,
    LoopStatement,
    MatchArm,
    MatchPattern,
    MatchStatement,
    OrbitBlock,
    Program,
    Statement,
    TopLevelDeclaration,
    TypeNode,
    VariableDecl,
    WhileStatement,
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
        let prev = this.current;
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
        if (!tokenTypes.includes(this.current.type)) {
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
        let declarations: TopLevelDeclaration[] = [];
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
        let type = this.parseCoreType();

        // postfix modifiers: ? and [] can both repeat/stack
        while (
            this.current.type === TokenType.QuestionMark ||
            this.current.type === TokenType.OpenBracket
        ) {
            if (this.current.type === TokenType.QuestionMark) {
                this.consume();
                type = { type: 'NullableType', inner: type };
            } else {
                this.consume(); // eat "["
                this.expect([TokenType.CloseBracket]); // eat "]"
                type = { type: 'ArrayType', element: type };
            }
        }

        return type;
    }

    private parseCoreType(): TypeNode {
        switch (this.current.type) {
            case TokenType.KeywordMap: {
                this.consume();
                this.expect([TokenType.LessThan]);
                const key = this.parseType();
                this.expect([TokenType.Comma]);
                const value = this.parseType();
                this.expect([TokenType.GreaterThan]);
                return { type: 'MapType', key, value };
            }

            case TokenType.KeywordResult: {
                this.consume();
                this.expect([TokenType.LessThan]);
                const ok = this.parseType();
                this.expect([TokenType.Comma]);
                const err = this.parseType();
                this.expect([TokenType.GreaterThan]);
                return { type: 'ResultType', ok, err };
            }

            case TokenType.OpenParen: {
                this.consume();
                const elements: TypeNode[] = [this.parseType()];
                while (this.current.type === TokenType.Comma) {
                    this.consume();
                    elements.push(this.parseType());
                }
                this.expect([TokenType.CloseParen]);
                return { type: 'TupleType', elements };
            }

            case TokenType.Identifier: {
                const name = this.consume().value;

                if (this.current.type === TokenType.LessThan) {
                    this.consume();
                    const typeArg = this.parseType();
                    this.expect([TokenType.GreaterThan]);
                    return { type: 'GenericType', name, typeArg };
                }

                return { type: 'GenericType', name, typeArg: null };
            }

            // base types — int, i8..i64, u8..u64, f32, f64, float, bool, char, byte, str, String
            case TokenType.KeywordInt:
            case TokenType.KeywordI8:
            case TokenType.KeywordI16:
            case TokenType.KeywordI32:
            case TokenType.KeywordI64:
            case TokenType.KeywordU8:
            case TokenType.KeywordU16:
            case TokenType.KeywordU32:
            case TokenType.KeywordU64:
            case TokenType.KeywordF32:
            case TokenType.KeywordF64:
            case TokenType.KeywordFloat:
            case TokenType.KeywordBool:
            case TokenType.KeywordChar:
            case TokenType.KeywordByte:
            case TokenType.KeywordStr:
            case TokenType.KeywordString: {
                const name = this.consume().value;
                return { type: 'BaseType', name };
            }

            default:
                globalErrorBucket.add({
                    type: ErrorType.SyntaxError,
                    message: `Expected a type but found ${this.current.type}`,
                    line: this.current.line,
                    col: this.current.col,
                });
                throw new Error('Expected a type');
        }
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

    private parseExpressionStatement(): ExpressionStatement {
        const expression = this.parseExpression();

        return {
            type: 'ExpressionStatement',
            expression: expression,
        };
    }

    private parseIfStatement(): IfStatement {
        this.expect([TokenType.KeywordIf]);
        const condition = this.parseExpression();
        const then = this.parseBlock();
        let elseBranch: Block | IfStatement | null;

        if (this.current.type === TokenType.KeywordElse) {
            if (this.peek(0).type === TokenType.KeywordIf) {
                this.consume();
                elseBranch = this.parseIfStatement();
                return {
                    type: 'IfStatement',
                    condition,
                    thenBranch: then,
                    elseBranch,
                };
            }
            this.consume();
            elseBranch = this.parseBlock();

            return {
                type: 'IfStatement',
                condition,
                thenBranch: then,
                elseBranch,
            };
        }

        elseBranch = null;

        return {
            type: 'IfStatement',
            condition,
            thenBranch: then,
            elseBranch,
        };
    }

    private parseForStatement(): ForStatement {
        this.expect([TokenType.KeywordFor]);
        const variable = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.KeywordIn]);
        const expr = this.parseExpression();
        const block = this.parseBlock();

        return {
            type: 'ForStatement',
            iterable: expr,
            body: block,
            variable,
        };
    }

    private parseWhileStatement(): WhileStatement {
        this.expect([TokenType.KeywordWhile]);
        const expr = this.parseExpression();
        const block = this.parseBlock();

        return {
            type: 'WhileStatement',
            condition: expr,
            body: block,
        };
    }

    private parseLoopStatement(): LoopStatement {
        this.expect([TokenType.KeywordLoop]);
        const block = this.parseBlock();

        return {
            type: 'LoopStatement',
            body: block,
        };
    }

    private parseMatchStatement(): MatchStatement {
        this.expect([TokenType.KeywordMatch]);
        const subject = this.parseExpression();
        const matchArms: MatchArm[] = [];

        this.expect([TokenType.OpenBrace]);
        while (this.current.type !== TokenType.CloseBrace) {
            matchArms.push(this.parseMatchArm());
            if (this.current.type === TokenType.Comma) {
                this.consume();
            }
        }
        this.consume();

        return {
            type: 'MatchStatement',
            subject,
            arms: matchArms,
        };
    }
    private parseMatchArm(): MatchArm {
        const pattern = this.parseMatchPattern();
        this.expect([TokenType.FatArrow]);
        let body: Expression | Block;

        if (this.current.type === TokenType.OpenBrace) {
            body = this.parseBlock();
        } else {
            body = this.parseExpression();
        }

        return {
            type: 'MatchArm',
            pattern,
            body,
        };
    }
    private parseMatchPattern(): MatchPattern {
        let kind = this.expect([
            TokenType.IntLiteral,
            TokenType.StrLiteral,
            TokenType.FloatLiteral,
            TokenType.BoolLiteral,
            TokenType.Identifier,
            TokenType.Underscore,
        ]);

        switch (kind.type) {
            case TokenType.IntLiteral:
            case TokenType.StrLiteral:
            case TokenType.BoolLiteral:
            case TokenType.FloatLiteral:
                const literal: Literal = this.parseLiteral();

                return {
                    type: 'LiteralPattern',
                    value: literal,
                };
            case TokenType.Underscore:
                return {
                    type: 'WildcardPattern',
                };

            case TokenType.Identifier:
                let name = this.consume().value;
                if (this.peek(0).type === TokenType.OpenParen) {
                    this.consume();
                    let patterns: MatchPattern[] = [];
                    patterns.push(this.parseMatchPattern());
                    while (this.current.type === TokenType.Comma) {
                        patterns.push(this.parseMatchPattern());
                    }

                    return {
                        type: 'ConstructorPattern',
                        name: name,
                        args: patterns,
                    };
                }
                return {
                    type: 'IdentifierPattern',
                    name: name,
                };
            default:
                globalErrorBucket.add({
                    type: ErrorType.SyntaxError,
                    message: `SyntaxError: Unkown match pattern`,
                    line: this.current.line,
                    col: this.current.col,
                });
                throw new Error(
                    'Expected Identifier, Constructor, Literal or _'
                );
        }
    }
    private parseLiteral(): Literal {
        switch (this.current.type) {
            case TokenType.IntLiteral:
                return { type: 'IntLiteral', value: this.consume().value };

            case TokenType.FloatLiteral:
                return { type: 'FloatLiteral', value: this.consume().value };

            case TokenType.StrLiteral:
                return { type: 'StrLiteral', value: this.consume().value };

            case TokenType.BoolLiteral:
                return {
                    type: 'BoolLiteral',
                    value: this.consume().value === 'true',
                };
            default:
                globalErrorBucket.add({
                    type: ErrorType.SyntaxError,
                    message: `Expexted a Literal but got ${this.current.value}`,
                    line: this.current.line,
                    col: this.current.col,
                    length: this.current.value.length,
                });
                throw new Error('Expected Literal');
        }
    }
    private parseOrbitBlock(): OrbitBlock {
        this.expect([TokenType.KeywordOrbit]);
        const name = this.expect([TokenType.Identifier]).value;
        const block = this.parseBlock();

        return {
            type: 'OrbitBlock',
            name,
            body: block,
        };
    }

    private parseDriftStatement(): DriftStatement {
        this.expect([TokenType.KeywordDrift]);
        const name = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Arrow, TokenType.KeywordInto]);
        if (
            this.current.type === TokenType.KeywordShared ||
            this.current.type === TokenType.KeywordSync
        ) {
            let kind = this.current.type;
            this.expect([TokenType.OpenParen]);
            let a = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.Comma]);
            let b = this.expect([TokenType.Identifier]).value;
            if (kind === TokenType.KeywordShared)
                return {
                    type: 'DriftShared',
                    name,
                    a,
                    b,
                };
            else
                return {
                    type: 'DriftSync',
                    name,
                    a,
                    b,
                };
        }

        const target = this.expect([TokenType.Identifier]).value;

        return {
            type: 'DriftExclusive',
            name,
            target,
        };
    }

    private parseDecayBlock(): Statement {
        throw new Error('Method not implemented.');
    }
    private parseFireStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    private parseReturnStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    private parseBreakStatement(): Statement {
        throw new Error('Method not implemented.');
    }
    private parseContinueStatement(): Statement {
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

    private parseExpression(): Expression {
        const left = this.parseLogicalExpr();

        if (
            this.current.type === TokenType.DotDot ||
            this.current.type === TokenType.DotDotEquals
        ) {
            const inclusive = this.current.type === TokenType.DotDotEquals;
            this.consume();
            const right = this.parseLogicalExpr();
            return { type: 'RangeExpr', inclusive, start: left, end: right };
        }

        return left;
    }

    private parseLogicalExpr(): Expression {
        let left = this.parseEqualityExpr();

        while (
            this.current.type === TokenType.LogicalAnd ||
            this.current.type === TokenType.LogicalOr
        ) {
            const operator = this.consume().value as '&&' | '||';
            const right = this.parseEqualityExpr();
            left = { type: 'BinaryExpr', operator, left, right };
        }

        return left;
    }

    private parseEqualityExpr(): Expression {
        let left = this.parseRelationalExpr();

        while (
            this.current.type === TokenType.DoubleEquals ||
            this.current.type === TokenType.NotEquals
        ) {
            const operator = this.consume().value as '==' | '!=';
            const right = this.parseRelationalExpr();
            left = { type: 'BinaryExpr', operator, left, right };
        }

        return left;
    }

    private parseRelationalExpr(): Expression {
        let left = this.parseAdditiveExpr();

        while (
            this.current.type === TokenType.LessThan ||
            this.current.type === TokenType.LessThanEquals ||
            this.current.type === TokenType.GreaterThan ||
            this.current.type === TokenType.GreaterThanEquals
        ) {
            const operator = this.consume().value as '<' | '<=' | '>' | '>=';
            const right = this.parseAdditiveExpr();
            left = { type: 'BinaryExpr', operator, left, right };
        }

        return left;
    }

    private parseAdditiveExpr(): Expression {
        let left = this.parseMultiplicativeExpr();

        while (
            this.current.type === TokenType.Add ||
            this.current.type === TokenType.Subtract
        ) {
            const operator = this.consume().value as '+' | '-';
            const right = this.parseMultiplicativeExpr();
            left = { type: 'BinaryExpr', operator, left, right };
        }

        return left;
    }

    private parseMultiplicativeExpr(): Expression {
        let left = this.parseUnaryExpr();

        while (
            this.current.type === TokenType.Multiply ||
            this.current.type === TokenType.Divide ||
            this.current.type === TokenType.Modulo
        ) {
            const operator = this.consume().value as '*' | '/' | '%';
            const right = this.parseUnaryExpr();
            left = { type: 'BinaryExpr', operator, left, right };
        }

        return left;
    }

    private parseUnaryExpr(): Expression {
        if (
            this.current.type === TokenType.LogicalNot ||
            this.current.type === TokenType.Subtract
        ) {
            const operator = this.consume().value as '!' | '-';
            const operand = this.parseUnaryExpr(); // recurse into itself, not the level below — grammar says UnaryExpr, not NullCheckExpr
            return { type: 'UnaryExpr', operator, operand };
        }

        return this.parseNullCheckExpr();
    }

    private parseNullCheckExpr(): Expression {
        const expr = this.parsePrimaryExpr();

        if (this.current.type === TokenType.QuestionMark) {
            this.consume();
            return { type: 'NullCheckExpr', expression: expr };
        }

        return expr;
    }

    private parsePrimaryExpr(): Expression {
        let expr = this.parseAtom();

        while (this.current.type === TokenType.Dot) {
            this.consume(); // eat "."
            const propertyName = this.expect([TokenType.Identifier]).value;

            if (this.current.type === TokenType.OpenParen) {
                this.consume(); // eat "("
                const args = this.parseArgumentList();
                this.expect([TokenType.CloseParen]);
                expr = {
                    type: 'MethodCall',
                    object: expr,
                    method: propertyName,
                    args,
                };
            } else {
                expr = {
                    type: 'MemberAccess',
                    object: expr,
                    property: propertyName,
                };
            }
        }

        return expr;
    }

    private parseAtom(): Expression {
        switch (this.current.type) {
            case TokenType.IntLiteral:
                return { type: 'IntLiteral', value: this.consume().value };

            case TokenType.FloatLiteral:
                return { type: 'FloatLiteral', value: this.consume().value };

            case TokenType.StrLiteral:
                return { type: 'StrLiteral', value: this.consume().value };

            case TokenType.BoolLiteral:
                return {
                    type: 'BoolLiteral',
                    value: this.consume().value === 'true',
                };

            case TokenType.KeywordNull:
                this.consume();
                return { type: 'NullLiteral' };

            case TokenType.OpenParen: {
                this.consume(); // eat "("
                const inner = this.parseExpression();
                this.expect([TokenType.CloseParen]);
                return inner;
            }

            case TokenType.Identifier: {
                const name = this.consume().value;

                if (this.current.type === TokenType.OpenParen) {
                    this.consume(); // eat "("
                    const args = this.parseArgumentList();
                    this.expect([TokenType.CloseParen]);
                    return { type: 'FunctionCall', name, args };
                }

                if (this.current.type === TokenType.OpenBrace) {
                    return this.parseStructInit(name);
                }

                return { type: 'Identifier', name };
            }

            default:
                globalErrorBucket.add({
                    type: ErrorType.SyntaxError,
                    message: `Unexpected token in expression: ${this.current.type}`,
                    line: this.current.line,
                    col: this.current.col,
                });
                throw new Error('Unexpected token in expression');
        }
    }

    private parseArgumentList(): Expression[] {
        const args: Expression[] = [];

        if (this.current.type === TokenType.CloseParen) {
            return args; // empty arg list, e.g. foo()
        }

        args.push(this.parseExpression());
        while (this.current.type === TokenType.Comma) {
            this.consume();
            args.push(this.parseExpression());
        }

        return args;
    }

    private parseStructInit(name: string): Expression {
        this.expect([TokenType.OpenBrace]);
        const fields: import('./nodeTypes').FieldInit[] = [];

        if (this.current.type !== TokenType.CloseBrace) {
            fields.push(this.parseFieldInit());
            while (this.current.type === TokenType.Comma) {
                this.consume();
                fields.push(this.parseFieldInit());
            }
        }

        this.expect([TokenType.CloseBrace]);
        return { type: 'StructInit', name, fields };
    }

    private parseFieldInit(): import('./nodeTypes').FieldInit {
        const fieldName = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Colon]);
        const value = this.parseExpression();
        return { type: 'FieldInit', name: fieldName, value };
    }
}
