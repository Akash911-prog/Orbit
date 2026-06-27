// ===== Program =======
export interface Program {
    type: 'Program';
    declarations: TopLevelDeclaration[];
}

// ===== Top level =====
export type TopLevelDeclaration =
    | VariableDecl
    | FunctionDecl
    | StructDecl
    | NovaDecl
    | RootOrbitDecl;

export interface RootOrbitDecl {
    type: 'RootOrbitDecl';
    body: Block;
}

export interface Block {
    type: 'Block';
    statements: Statement[];
}

// ===== Statements =====
export type Statement =
    | VariableDecl
    | Assignment
    | IfStatement
    | ForStatement
    | WhileStatement
    | LoopStatement
    | MatchStatement
    | OrbitBlock
    | DriftStatement
    | DecayBlock
    | FireStatement
    | ReturnStatement
    | BreakStatement
    | ContinueStatement
    | ExpressionStatement;

export interface VariableDecl {
    type: 'VariableDecl';
    kind: 'let' | 'var';
    name: string;
    varType: TypeNode;
    initializer: Expression;
}

export interface Assignment {
    type: 'Assignment';
    target: string[]; // Identifier { "." Identifier } — the access chain
    value: Expression;
}

export interface ReturnStatement {
    type: 'ReturnStatement';
    value: Expression | null;
}
export interface BreakStatement {
    type: 'BreakStatement';
    label: string | null;
}
export interface ContinueStatement {
    type: 'ContinueStatement';
}
export interface ExpressionStatement {
    type: 'ExpressionStatement';
    expression: Expression;
}

// ===== Control flow =====
export interface IfStatement {
    type: 'IfStatement';
    condition: Expression;
    thenBranch: Block;
    elseBranch: Block | IfStatement | null; // nested, per our earlier decision
}

export interface ForStatement {
    type: 'ForStatement';
    variable: string;
    iterable: Expression;
    body: Block;
}

export interface WhileStatement {
    type: 'WhileStatement';
    condition: Expression;
    body: Block;
}
export interface LoopStatement {
    type: 'LoopStatement';
    body: Block;
}

export interface MatchStatement {
    type: 'MatchStatement';
    subject: Expression;
    arms: MatchArm[];
}

export interface MatchArm {
    type: 'MatchArm';
    pattern: MatchPattern;
    body: Expression | Block;
}

export type MatchPattern =
    | { type: 'LiteralPattern'; value: Literal }
    | { type: 'IdentifierPattern'; name: string }
    | { type: 'WildcardPattern' } // "_"
    | { type: 'ConstructorPattern'; name: string; args: MatchPattern[] }; // ok(data), err(e)

// ===== Orbit lifecycle primitives =====
export interface OrbitBlock {
    type: 'OrbitBlock';
    name: string;
    body: Block;
}

export type DriftStatement =
    | { type: 'DriftExclusive'; name: string; target: string } // -> or into
    | { type: 'DriftShared'; name: string; a: string; b: string } // -> or into shared(a, b)
    | { type: 'DriftSync'; name: string; a: string; b: string }; // -> or into sync(a, b)

export interface DecayBlock {
    type: 'DecayBlock';
    target: string | null; // null = nearest orbit
    body: Block;
}

export interface NovaDecl {
    type: 'NovaDecl';
    name: string;
    parameters: Parameter[];
    body: Block;
}

export interface FireStatement {
    type: 'FireStatement';
    name: string;
    args: Expression[];
}

// ===== Functions =====
export interface FunctionDecl {
    type: 'FunctionDecl';
    name: string;
    generic: string | null; // <T>
    parameters: Parameter[];
    returnType: TypeNode | null;
    body: Block;
}

export interface Parameter {
    type: 'Parameter';
    name: string;
    paramType: TypeNode;
}

// ===== Structs =====
export interface StructDecl {
    type: 'StructDecl';
    name: string;
    generic: string | null;
    members: StructMember[];
}

export type StructMember = VariableDecl | FunctionDecl | ResponsibleBlock;

export interface ResponsibleBlock {
    type: 'ResponsibleBlock';
    owns: string[]; // identifiers struct is responsible for freeing
    cleanup: Block | null; // optional action block
}

// ===== Types (these are type ANNOTATIONS, separate AST family from expressions) =====
export type TypeNode =
    | { type: 'BaseType'; name: string } // int, f32, str, ...
    | { type: 'NullableType'; inner: TypeNode } // int?
    | { type: 'ArrayType'; element: TypeNode } // int[]
    | { type: 'MapType'; key: TypeNode; value: TypeNode } // map<K,V>
    | { type: 'TupleType'; elements: TypeNode[] } // (int, str)
    | { type: 'ResultType'; ok: TypeNode; err: TypeNode } // Result<T,E>
    | { type: 'GenericType'; name: string; typeArg: TypeNode | null }; // Stack<T>

// ===== Expressions =====
export type Expression =
    | RangeExpr
    | BinaryExpr
    | UnaryExpr
    | NullCheckExpr
    | MemberAccess
    | MethodCall
    | FunctionCall
    | StructInit
    | Identifier
    | Literal
    | NullLiteral;

export interface RangeExpr {
    type: 'RangeExpr';
    inclusive: boolean; // false = .. , true = ..=
    start: Expression;
    end: Expression;
}

export interface BinaryExpr {
    type: 'BinaryExpr';
    operator:
        | '&&'
        | '||'
        | '=='
        | '!='
        | '<'
        | '<='
        | '>'
        | '>='
        | '+'
        | '-'
        | '*'
        | '/'
        | '%';
    left: Expression;
    right: Expression;
}

export interface UnaryExpr {
    type: 'UnaryExpr';
    operator: '!' | '-';
    operand: Expression;
}

export interface NullCheckExpr {
    type: 'NullCheckExpr';
    expression: Expression;
}

export interface MemberAccess {
    type: 'MemberAccess';
    object: Expression;
    property: string;
}
export interface MethodCall {
    type: 'MethodCall';
    object: Expression;
    method: string;
    args: Expression[];
}

export interface FunctionCall {
    type: 'FunctionCall';
    name: string;
    args: Expression[];
}

export interface StructInit {
    type: 'StructInit';
    name: string;
    fields: FieldInit[];
}
export interface FieldInit {
    type: 'FieldInit';
    name: string;
    value: Expression;
}

export interface Identifier {
    type: 'Identifier';
    name: string;
}

export type Literal = IntLiteral | FloatLiteral | StrLiteral | BoolLiteral;
export interface IntLiteral {
    type: 'IntLiteral';
    value: string;
}
export interface FloatLiteral {
    type: 'FloatLiteral';
    value: string;
}
export interface StrLiteral {
    type: 'StrLiteral';
    value: string;
}
export interface BoolLiteral {
    type: 'BoolLiteral';
    value: boolean;
}
export interface NullLiteral {
    type: 'NullLiteral';
}
