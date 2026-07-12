import { ErrorType } from '../errors/errorTypes';
import { globalErrorBucket } from '../globals';
import type { Lexer } from '../lexer/lexer';
import { TokenType, type Token } from '../lexer/token';
import type {
    ArrayLiteral,
    Assignment,
    Block,
    BreakStatement,
    ContinueStatement,
    DecayBlock,
    DriftStatement,
    Expression,
    ExpressionStatement,
    FieldInit,
    FireStatement,
    ForStatement,
    FunctionDecl,
    IfStatement,
    Literal,
    LoopStatement,
    MapLiteral,
    MatchArm,
    MatchPattern,
    MatchStatement,
    NovaDecl,
    OrbitBlock,
    Parameter,
    Program,
    ResponsibleBlock,
    ReturnStatement,
    RootOrbitDecl,
    Statement,
    StructDecl,
    StructMember,
    TopLevelDeclaration,
    TupleLiteral,
    TypeNode,
    VariableDecl,
    WhileStatement,
} from './nodeTypes';

export class Parser {
    private current: Token;
    private lookahead: Token[] = [];
    private lexer: Lexer;
    private debug: Boolean;

    constructor(lexer: Lexer, debug = false) {
        this.lexer = lexer;
        this.current = this.lexer.nextToken();
        this.debug = debug;
    }

    private log(label: string) {
        if (!this.debug) return;
        console.log(
            `[${label}] current=${this.current.type}(${JSON.stringify(this.current.value)}) line=${this.current.line} col=${this.current.col}`
        );
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
            // Map the types to strings (or use them directly if they are strings) and join them
            const expectedList = tokenTypes.join(', ');

            globalErrorBucket.add({
                type: ErrorType.SyntaxError,
                message: `Expected one of: [${expectedList}] but found ${this.current.type}`,
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
        this.log('parseVariableDecl');
        const { line, col, ..._ } = this.current;
        const kind = this.expect([TokenType.KeywordLet, TokenType.KeywordVar])
            .value as 'let' | 'var';
        const name = this.expect([TokenType.Identifier]).value;
        let type: TypeNode | null = null;
        if (this.current.type === TokenType.Colon) {
            this.expect([TokenType.Colon]);
            type = this.parseType();
        }
        if (
            this.current.type !== TokenType.Equals &&
            this.current.type === TokenType.Semicolon
        ) {
            this.expect([TokenType.Semicolon]);
            return {
                type: 'VariableDecl',
                kind: kind,
                name: name,
                varType: type,
                initializer: null,
                line,
                col,
            };
        }
        this.expect([TokenType.Equals]);
        const expression: Expression = this.parseExpression();
        this.expect([TokenType.Semicolon]);

        return {
            type: 'VariableDecl',
            kind: kind,
            name: name,
            varType: type,
            initializer: expression,
            line,
            col,
        };
    }

    private parseType(): TypeNode {
        this.log('parseType');
        const { line, col, ..._ } = this.current;
        let type = this.parseCoreType();

        // postfix modifiers: ? and [] can both repeat/stack
        while (
            this.current.type === TokenType.QuestionMark ||
            this.current.type === TokenType.OpenBracket
        ) {
            if (this.current.type === TokenType.QuestionMark) {
                this.consume();
                type = { type: 'NullableType', inner: type, line, col };
            } else {
                this.consume(); // eat "["
                this.expect([TokenType.CloseBracket]); // eat "]"
                type = { type: 'ArrayType', element: type, line, col };
            }
        }

        return type;
    }

    private parseCoreType(): TypeNode {
        this.log('parseCoreType');
        const { line, col, ..._ } = this.current;
        switch (this.current.type) {
            case TokenType.KeywordMap: {
                this.consume();
                this.expect([TokenType.LessThan]);
                const key = this.parseType();
                this.expect([TokenType.Comma]);
                const value = this.parseType();
                this.expect([TokenType.GreaterThan]);
                return { type: 'MapType', key, value, line, col };
            }

            case TokenType.KeywordResult: {
                this.consume();
                this.expect([TokenType.LessThan]);
                const ok = this.parseType();
                this.expect([TokenType.Comma]);
                const err = this.parseType();
                this.expect([TokenType.GreaterThan]);
                return { type: 'ResultType', ok, err, line, col };
            }

            case TokenType.OpenParen: {
                this.consume();
                const elements: TypeNode[] = [this.parseType()];
                while (this.current.type === TokenType.Comma) {
                    this.consume();
                    elements.push(this.parseType());
                }
                this.expect([TokenType.CloseParen]);
                return { type: 'TupleType', elements, line, col };
            }

            case TokenType.Identifier: {
                const name = this.consume().value;

                if (this.current.type === TokenType.LessThan) {
                    this.consume();
                    const typeArg = this.parseType();
                    this.expect([TokenType.GreaterThan]);
                    return { type: 'GenericType', name, typeArg, line, col };
                }

                return { type: 'GenericType', name, typeArg: null, line, col };
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
            case TokenType.KeywordNull:
            case TokenType.KeywordString: {
                const name = this.consume().value;
                return { type: 'BaseType', name, line, col };
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

    private parseStructDecl(): StructDecl {
        this.log('parseStructDecl');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordStruct]);
        const name = this.expect([TokenType.Identifier]).value;
        let structMembers: StructMember[] = [];
        let generic: string | null = null;
        if (this.current.type === TokenType.LessThan) {
            this.consume();
            generic = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.GreaterThan]);
        }
        this.expect([TokenType.OpenBrace]);
        while (this.current.type !== TokenType.CloseBrace) {
            structMembers.push(this.parseStructMember());
        }
        this.expect([TokenType.CloseBrace]);

        return {
            type: 'StructDecl',
            name,
            generic,
            members: structMembers,
            line,
            col,
        };
    }

    private parseStructMember(): StructMember {
        this.log('parseStructMember');
        switch (this.current.type) {
            case TokenType.KeywordVar:
            case TokenType.KeywordLet:
                return this.parseVariableDecl();
            case TokenType.KeywordFn:
                return this.parseFunctionDecl();
            case TokenType.KeywordResponsible:
                return this.parseResponsibleDecl();
            default:
                globalErrorBucket.add({
                    type: ErrorType.SyntaxError,
                    message: `Expected a struct member but found ${this.current.type}`,
                    line: this.current.line,
                    col: this.current.col,
                });
                throw new Error('Expected a struct member');
        }
    }

    private parseResponsibleDecl(): ResponsibleBlock {
        this.log('parseResponsibleDecl');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordResponsible]);
        let owns: string[] = [];
        while (
            this.current.type !== TokenType.OpenBrace &&
            this.current.type !== TokenType.Semicolon
        ) {
            owns.push(this.expect([TokenType.Identifier]).value);
        }
        let block: Block | null = null;
        if (this.current.type === TokenType.OpenBrace) {
            block = this.parseBlock();
        } else {
            this.consume();
        }
        return { type: 'ResponsibleBlock', owns, cleanup: block, line, col };
    }

    private parseNovaDecl(): NovaDecl {
        this.log('parseNovaDecl');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordNova]);
        const name = this.expect([TokenType.Identifier]).value;
        let paramList: Parameter[] = [];
        this.expect([TokenType.OpenParen]);

        if (this.current.type !== TokenType.CloseParen) {
            paramList = this.parseParameterList();
        }
        this.consume();
        const body = this.parseBlock();

        return {
            type: 'NovaDecl',
            name,
            body,
            parameters: paramList,
            line,
            col,
        };
    }

    private parseParameterList(): Parameter[] {
        this.log('parseParameterList');
        let paramList: Parameter[] = [];
        paramList.push(this.parseParameter());
        while (this.current.type === TokenType.Comma) {
            this.consume();
            paramList.push(this.parseParameter());
        }
        return paramList;
    }

    private parseParameter(): Parameter {
        this.log('parseParameter');
        const { line, col, ..._ } = this.current;
        const name = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Colon]);
        const type = this.parseType();
        return { type: 'Parameter', name, paramType: type, line, col };
    }

    private parseRootOrbitDecl(): RootOrbitDecl {
        this.log('parseRootOrbitDecl');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordOrbit]);
        this.expect([TokenType.KeywordMain]);

        const block = this.parseBlock();

        return { type: 'RootOrbitDecl', body: block, line, col };
    }

    private parseFunctionDecl(): FunctionDecl {
        this.log('parseFunctionDecl');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordFn]);
        const name = this.expect([TokenType.Identifier]).value;
        let generic: string | null = null;
        if (this.current.type === TokenType.LessThan) {
            this.consume();
            generic = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.GreaterThan]);
        }
        let paramList: Parameter[] = [];
        let typeArg: TypeNode | null = null;
        this.expect([TokenType.OpenParen]);
        if (this.current.type !== TokenType.CloseParen) {
            paramList = this.parseParameterList();
        }
        this.expect([TokenType.CloseParen]);
        if (this.current.type === TokenType.Colon) {
            this.consume();
            typeArg = this.parseType();
        }
        const body = this.parseBlock();
        return {
            type: 'FunctionDecl',
            name,
            body,
            generic,
            parameters: paramList,
            returnType: typeArg,
            line,
            col,
        };
    }

    private parseBlock(): Block {
        this.log('parseBlock');
        const { line, col, ..._ } = this.current;
        const statements: Statement[] = [];
        this.expect([TokenType.OpenBrace]);

        while (this.current.type !== TokenType.CloseBrace) {
            statements.push(this.parseStatement());
        }
        this.expect([TokenType.CloseBrace]);
        return { type: 'Block', statements: statements, line, col };
    }

    private parseStatement(): Statement {
        this.log('parseStatement');
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

            case TokenType.KeywordFn:
                return this.parseFunctionDecl();

            case TokenType.KeywordStruct:
                return this.parseStructDecl();

            case TokenType.KeywordNova:
                return this.parseNovaDecl();

            default:
                return this.parseExpressionStatement();
        }
    }

    private parseExpressionStatement(): ExpressionStatement {
        this.log('parseExpressionStatement');
        const { line, col, ..._ } = this.current;
        const expression = this.parseExpression();
        this.expect([TokenType.Semicolon]);
        return {
            type: 'ExpressionStatement',
            expression: expression,
            line,
            col,
        };
    }

    private parseIfStatement(): IfStatement {
        this.log('parseIfStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordIf]);
        this.expect([TokenType.OpenParen]);
        const condition = this.parseExpression();
        this.expect([TokenType.CloseParen]);
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
                    line,
                    col,
                };
            }
            this.consume();
            elseBranch = this.parseBlock();

            return {
                type: 'IfStatement',
                condition,
                thenBranch: then,
                elseBranch,
                line,
                col,
            };
        }

        elseBranch = null;

        return {
            type: 'IfStatement',
            condition,
            thenBranch: then,
            elseBranch,
            line,
            col,
        };
    }

    private parseForStatement(): ForStatement {
        this.log('parseForStatement');
        const { line, col, ..._ } = this.current;
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
            line,
            col,
        };
    }

    private parseWhileStatement(): WhileStatement {
        this.log('parseWhileStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordWhile]);
        const expr = this.parseExpression();
        const block = this.parseBlock();

        return {
            type: 'WhileStatement',
            condition: expr,
            body: block,
            line,
            col,
        };
    }

    private parseLoopStatement(): LoopStatement {
        this.log('parseLoopStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordLoop]);
        const name =
            this.current.type === TokenType.Identifier
                ? this.consume().value
                : null;
        const block = this.parseBlock();

        return {
            type: 'LoopStatement',
            name,
            body: block,
            line,
            col,
        };
    }

    private parseMatchStatement(): MatchStatement {
        this.log('parseMatchStatement');
        const { line, col, ..._ } = this.current;
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
            line,
            col,
        };
    }
    private parseMatchArm(): MatchArm {
        this.log('parseMatchArm');
        const { line, col, ..._ } = this.current;
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
            line,
            col,
        };
    }
    private parseMatchPattern(): MatchPattern {
        this.log('parseMatchPattern');
        const { line, col, ..._ } = this.current;
        switch (this.current.type) {
            case TokenType.IntLiteral:
            case TokenType.StrLiteral:
            case TokenType.BoolLiteral:
            case TokenType.FloatLiteral:
                const literal: Literal = this.parseLiteral();

                return {
                    type: 'LiteralPattern',
                    value: literal,
                    line,
                    col,
                };
            case TokenType.Underscore:
                this.expect([TokenType.Underscore]);
                return {
                    type: 'WildcardPattern',
                    line,
                    col,
                };

            case TokenType.Identifier:
                let name = this.consume().value;
                if (this.current.type === TokenType.OpenParen) {
                    this.consume();
                    let patterns: MatchPattern[] = [];
                    patterns.push(this.parseMatchPattern());
                    while (this.current.type === TokenType.Comma) {
                        patterns.push(this.parseMatchPattern());
                    }
                    this.expect([TokenType.CloseParen]);

                    return {
                        type: 'ConstructorPattern',
                        name: name,
                        args: patterns,
                        line,
                        col,
                    };
                }
                return {
                    type: 'IdentifierPattern',
                    name: name,
                    line,
                    col,
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
        this.log('parseLiteral');
        const { line, col, ..._ } = this.current;
        switch (this.current.type) {
            case TokenType.IntLiteral:
                return {
                    type: 'IntLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.FloatLiteral:
                return {
                    type: 'FloatLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.StrLiteral:
                return {
                    type: 'StrLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.BoolLiteral:
                return {
                    type: 'BoolLiteral',
                    value: this.consume().value === 'true',
                    line,
                    col,
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
        this.log('parseOrbitBlock');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordOrbit]);
        const name = this.expect([TokenType.Identifier]).value;
        const block = this.parseBlock();

        return {
            type: 'OrbitBlock',
            name,
            body: block,
            line,
            col,
        };
    }

    private parseDriftStatement(): DriftStatement {
        this.log('parseDriftStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordDrift]);
        const name = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Arrow, TokenType.KeywordInto]);
        if (
            this.current.type === TokenType.KeywordShared ||
            this.current.type === TokenType.KeywordSync
        ) {
            const kind = this.current.type;
            this.consume(); // eat "shared"/"sync" keyword itself
            this.expect([TokenType.OpenParen]);
            const a = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.Comma]);
            const b = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.CloseParen]);
            this.expect([TokenType.Semicolon]);

            if (kind === TokenType.KeywordShared)
                return { type: 'DriftShared', name, a, b, line, col };
            else return { type: 'DriftSync', name, a, b, line, col };
        }

        const target = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Semicolon]);

        return { type: 'DriftExclusive', name, target, line, col };
    }

    private parseDecayBlock(): DecayBlock {
        this.log('parseDecayBlock');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordDecay]);
        let target: string | null = null;
        if (this.current.type === TokenType.Identifier) {
            target = this.consume().value;
        }
        const body = this.parseBlock();
        return {
            type: 'DecayBlock',
            target,
            body,
            line,
            col,
        };
    }

    private parseFireStatement(): FireStatement {
        this.log('parseFireStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordFire]);
        const name = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.OpenParen]);
        let expressions: Expression[] = [];
        if (this.current.type !== TokenType.CloseParen) {
            expressions = this.parseArgumentList();
        }
        this.expect([TokenType.CloseParen]);
        this.expect([TokenType.Semicolon]);
        return {
            type: 'FireStatement',
            args: expressions,
            name,
            line,
            col,
        };
    }

    private parseReturnStatement(): ReturnStatement {
        this.log('parseReturnStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordReturn]);
        let expr: Expression | null = null;
        if (this.current.type !== TokenType.Semicolon) {
            expr = this.parseExpression();
        }
        this.expect([TokenType.Semicolon]);
        return { type: 'ReturnStatement', value: expr, line, col };
    }

    private parseBreakStatement(): BreakStatement {
        this.log('parseBreakStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordBreak]);
        let label: string | null = null;
        if (this.current.type !== TokenType.Semicolon) {
            label = this.expect([TokenType.Identifier]).value;
        }
        this.expect([TokenType.Semicolon]);
        return { type: 'BreakStatement', label, line, col };
    }

    private parseContinueStatement(): ContinueStatement {
        this.log('parseContinueStatement');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.KeywordContinue]);
        this.expect([TokenType.Semicolon]);
        return { type: 'ContinueStatement', line, col };
    }

    private parseIdentifierStartedStatement():
        | Assignment
        | ExpressionStatement {
        this.log('parseIdentifierStartedStatement');
        const { line, col, ..._ } = this.current;
        const expr = this.parseExpression();

        if (this.current.type === TokenType.Equals) {
            this.consume(); // eat "="
            const value = this.parseExpression();
            const target = this.expressionToAssignmentTarget(expr);
            this.expect([TokenType.Semicolon]);
            return { type: 'Assignment', target, value, line, col };
        }

        this.expect([TokenType.Semicolon]);
        return { type: 'ExpressionStatement', expression: expr, line, col };
    }

    private expressionToAssignmentTarget(expr: Expression): string[] {
        this.log('expressionToAssignmentTarget');
        const { line, col, ..._ } = this.current;
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
        this.log('parseExpression');
        const { line, col, ..._ } = this.current;
        const left = this.parseLogicalExpr();

        if (
            this.current.type === TokenType.DotDot ||
            this.current.type === TokenType.DotDotEquals
        ) {
            const inclusive = this.current.type === TokenType.DotDotEquals;
            this.consume();
            const right = this.parseLogicalExpr();
            return {
                type: 'RangeExpr',
                inclusive,
                start: left,
                end: right,
                line,
                col,
            };
        }

        return left;
    }

    private parseLogicalExpr(): Expression {
        this.log('parseLogicalExpr');
        const { line, col, ..._ } = this.current;
        let left = this.parseEqualityExpr();

        while (
            this.current.type === TokenType.LogicalAnd ||
            this.current.type === TokenType.LogicalOr
        ) {
            const operator = this.consume().value as '&&' | '||';
            const right = this.parseEqualityExpr();
            left = { type: 'BinaryExpr', operator, left, right, line, col };
        }

        return left;
    }

    private parseEqualityExpr(): Expression {
        this.log('parseEqualityExpr');
        const { line, col, ..._ } = this.current;
        let left = this.parseRelationalExpr();

        while (
            this.current.type === TokenType.DoubleEquals ||
            this.current.type === TokenType.NotEquals
        ) {
            const operator = this.consume().value as '==' | '!=';
            const right = this.parseRelationalExpr();
            left = { type: 'BinaryExpr', operator, left, right, line, col };
        }

        return left;
    }

    private parseRelationalExpr(): Expression {
        this.log('parseRelationalExpr');
        const { line, col, ..._ } = this.current;
        let left = this.parseAdditiveExpr();

        while (
            this.current.type === TokenType.LessThan ||
            this.current.type === TokenType.LessThanEquals ||
            this.current.type === TokenType.GreaterThan ||
            this.current.type === TokenType.GreaterThanEquals
        ) {
            const operator = this.consume().value as '<' | '<=' | '>' | '>=';
            const right = this.parseAdditiveExpr();
            left = { type: 'BinaryExpr', operator, left, right, line, col };
        }

        return left;
    }

    private parseAdditiveExpr(): Expression {
        this.log('parseAdditiveExpr');
        const { line, col, ..._ } = this.current;
        let left = this.parseMultiplicativeExpr();

        while (
            this.current.type === TokenType.Add ||
            this.current.type === TokenType.Subtract
        ) {
            const operator = this.consume().value as '+' | '-';
            const right = this.parseMultiplicativeExpr();
            left = { type: 'BinaryExpr', operator, left, right, line, col };
        }

        return left;
    }

    private parseMultiplicativeExpr(): Expression {
        this.log('parseMultiplicativeExpr');
        const { line, col, ..._ } = this.current;
        let left = this.parseUnaryExpr();

        while (
            this.current.type === TokenType.Multiply ||
            this.current.type === TokenType.Divide ||
            this.current.type === TokenType.Modulo
        ) {
            const operator = this.consume().value as '*' | '/' | '%';
            const right = this.parseUnaryExpr();
            left = { type: 'BinaryExpr', operator, left, right, line, col };
        }

        return left;
    }

    private parseUnaryExpr(): Expression {
        this.log('parseUnaryExpr');
        const { line, col, ..._ } = this.current;
        if (
            this.current.type === TokenType.LogicalNot ||
            this.current.type === TokenType.Subtract
        ) {
            const operator = this.consume().value as '!' | '-';
            const operand = this.parseUnaryExpr(); // recurse into itself, not the level below — grammar says UnaryExpr, not NullCheckExpr
            return { type: 'UnaryExpr', operator, operand, line, col };
        }

        return this.parseNullCheckExpr();
    }

    private parseNullCheckExpr(): Expression {
        this.log('parseNullCheckExpr');
        const { line, col, ..._ } = this.current;
        const expr = this.parsePrimaryExpr();

        if (this.current.type === TokenType.QuestionMark) {
            this.consume();
            return { type: 'NullCheckExpr', expression: expr, line, col };
        }

        return expr;
    }

    private parsePrimaryExpr(): Expression {
        this.log('parsePrimaryExpr');
        const { line, col, ..._ } = this.current;
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
                    line,
                    col,
                };
            } else {
                expr = {
                    type: 'MemberAccess',
                    object: expr,
                    property: propertyName,
                    line,
                    col,
                };
            }
        }

        if (this.current.type === TokenType.OpenBracket) {
            this.consume(); // eat "["
            const index = this.parseExpression();
            this.expect([TokenType.CloseBracket]); // eat "]"
            expr = { type: 'IndexExpr', object: expr, index, line, col };
        }

        return expr;
    }

    private parseAtom(): Expression {
        this.log('parseAtom');
        const { line, col, ..._ } = this.current;
        switch (this.current.type) {
            case TokenType.IntLiteral:
                return {
                    type: 'IntLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.FloatLiteral:
                return {
                    type: 'FloatLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.StrLiteral:
                return {
                    type: 'StrLiteral',
                    value: this.consume().value,
                    line,
                    col,
                };

            case TokenType.BoolLiteral:
                return {
                    type: 'BoolLiteral',
                    value: this.consume().value === 'true',
                    line,
                    col,
                };

            case TokenType.OpenBracket:
                return this.parseArrayLiteral();

            case TokenType.KeywordNull:
                this.consume();
                return { type: 'NullLiteral', line, col };

            case TokenType.OpenParen: {
                if (this.peek(1).type === TokenType.Comma) {
                    return this.parseTupleLiteral();
                }
                this.consume(); // eat "("
                const inner = this.parseExpression();
                this.expect([TokenType.CloseParen]);
                return inner;
            }

            case TokenType.OpenBrace:
                return this.parseMapLiteral();

            case TokenType.Identifier: {
                const name = this.consume().value;

                if (this.current.type === TokenType.OpenParen) {
                    this.consume(); // eat "("
                    const args = this.parseArgumentList();
                    this.expect([TokenType.CloseParen]);
                    return { type: 'FunctionCall', name, args, line, col };
                }

                if (this.current.type === TokenType.OpenBrace) {
                    if (
                        this.peek(1).type === TokenType.FatArrow ||
                        this.peek(1).type === TokenType.OpenParen
                    ) {
                        return { type: 'Identifier', name, line, col };
                    }
                    return this.parseStructInit(name);
                }

                return { type: 'Identifier', name, line, col };
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
    private parseMapLiteral(): MapLiteral {
        this.log('parseMapLiteral');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.OpenBrace]);
        const elements: { key: string; value: Expression }[] = [];
        const key = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Colon]);
        const value = this.parseExpression();
        elements.push({ key, value });
        while (this.current.type === TokenType.Comma) {
            this.consume();
            const key = this.expect([TokenType.Identifier]).value;
            this.expect([TokenType.Colon]);
            const value = this.parseExpression();
            elements.push({ key, value });
        }
        this.expect([TokenType.CloseBrace]);
        return { type: 'MapLiteral', elements, line, col };
    }

    private parseArrayLiteral(): ArrayLiteral {
        this.log('parseArrayLiteral');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.OpenBracket]);
        const elements: Expression[] = [];
        if (this.current.type === TokenType.CloseBracket) {
            this.consume();
            return { type: 'ArrayLiteral', elements, line, col };
        }
        elements.push(this.parseExpression());
        while (this.current.type === TokenType.Comma) {
            this.consume();
            elements.push(this.parseExpression());
        }
        this.expect([TokenType.CloseBracket]);
        return { type: 'ArrayLiteral', elements, line, col };
    }

    private parseTupleLiteral(): TupleLiteral {
        this.log('parseTupleLiteral');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.OpenParen]);
        const elements: Expression[] = [this.parseExpression()];
        while (this.current.type === TokenType.Comma) {
            this.consume();
            elements.push(this.parseExpression());
        }
        this.expect([TokenType.CloseParen]);
        return { type: 'TupleLiteral', elements, line, col };
    }

    private parseArgumentList(): Expression[] {
        this.log('parseArgumentList');
        const { line, col, ..._ } = this.current;
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
        this.log('parseStructInit');
        const { line, col, ..._ } = this.current;
        this.expect([TokenType.OpenBrace]);
        const fields: FieldInit[] = [];

        if (this.current.type !== TokenType.CloseBrace) {
            fields.push(this.parseFieldInit());
            while (this.current.type === TokenType.Comma) {
                this.consume();
                fields.push(this.parseFieldInit());
            }
        }

        this.expect([TokenType.CloseBrace]);
        return { type: 'StructInit', name, fields, line, col };
    }

    private parseFieldInit(): FieldInit {
        this.log('parseFieldInit');
        const { line, col, ..._ } = this.current;
        const fieldName = this.expect([TokenType.Identifier]).value;
        this.expect([TokenType.Colon]);
        const value = this.parseExpression();
        return { type: 'FieldInit', name: fieldName, value, line, col };
    }
}
