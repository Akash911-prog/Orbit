import type { SymbolEntry } from '../symbolTable/symbolTable';
import type { OrbType } from '../types';

export interface NodeBase {
    line: number;
    col: number;
    resolvedType?: OrbType;
    isStringConcat?: boolean;
    moved?: boolean;
}

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

export interface RootOrbitDecl extends NodeBase {
    type: 'RootOrbitDecl';
    body: Block;
}

export interface Block extends NodeBase {
    type: 'Block';
    statements: Statement[];
    needFree: SymbolEntry[];
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
    | ExpressionStatement
    | FunctionDecl
    | NovaDecl
    | StructDecl;

export interface VariableDecl extends NodeBase {
    type: 'VariableDecl';
    kind: 'let' | 'var';
    name: string;
    varType: TypeNode | null;
    initializer: Expression | null;
}

export interface Assignment extends NodeBase {
    type: 'Assignment';
    target: string[]; // Identifier { "." Identifier } — the access chain
    value: Expression;
    targetCopyable?: boolean;
}

export interface ReturnStatement extends NodeBase {
    type: 'ReturnStatement';
    value: Expression | null;
}
export interface BreakStatement extends NodeBase {
    type: 'BreakStatement';
    label: string | null;
}
export interface ContinueStatement extends NodeBase {
    type: 'ContinueStatement';
}
export interface ExpressionStatement extends NodeBase {
    type: 'ExpressionStatement';
    expression: Expression;
}

// ===== Control flow =====
export interface IfStatement extends NodeBase {
    type: 'IfStatement';
    condition: Expression;
    thenBranch: Block;
    elseBranch: Block | IfStatement | null; // nested, per our earlier decision
}

export interface ForStatement extends NodeBase {
    type: 'ForStatement';
    variable: string;
    iterable: Expression;
    body: Block;
}

export interface WhileStatement extends NodeBase {
    type: 'WhileStatement';
    condition: Expression;
    body: Block;
}
export interface LoopStatement extends NodeBase {
    type: 'LoopStatement';
    name: string | null;
    body: Block;
}

export interface MatchStatement extends NodeBase {
    type: 'MatchStatement';
    subject: Expression;
    arms: MatchArm[];
}

export interface MatchArm extends NodeBase {
    type: 'MatchArm';
    pattern: MatchPattern;
    body: Expression | Block;
}

export type MatchPattern =
    | ({ type: 'LiteralPattern'; value: Literal } & NodeBase)
    | ({ type: 'IdentifierPattern'; name: string } & NodeBase)
    | ({ type: 'WildcardPattern' } & NodeBase)
    | ({
          type: 'ConstructorPattern';
          name: string;
          args: MatchPattern[];
      } & NodeBase);

// ===== Orbit lifecycle primitives =====
export interface OrbitBlock extends NodeBase {
    type: 'OrbitBlock';
    name: string;
    body: Block;
}

export type DriftStatement =
    | ({ type: 'DriftExclusive'; name: string; target: string } & NodeBase)
    | ({ type: 'DriftShared'; name: string; a: string; b: string } & NodeBase)
    | ({ type: 'DriftSync'; name: string; a: string; b: string } & NodeBase);

export interface DecayBlock extends NodeBase {
    type: 'DecayBlock';
    target: string | null; // null = nearest orbit
    body: Block;
}

export interface NovaDecl extends NodeBase {
    type: 'NovaDecl';
    name: string;
    parameters: Parameter[];
    body: Block;
}

export interface FireStatement extends NodeBase {
    type: 'FireStatement';
    name: string;
    args: Expression[];
}

// ===== Functions =====
export interface FunctionDecl extends NodeBase {
    type: 'FunctionDecl';
    name: string;
    generic: string | null; // <T>
    parameters: Parameter[];
    returnType: TypeNode | null;
    body: Block;
    struct?: string;
}

export interface Parameter extends NodeBase {
    type: 'Parameter';
    name: string;
    paramType: TypeNode;
}

// ===== Structs =====
export interface StructDecl extends NodeBase {
    type: 'StructDecl';
    name: string;
    generic: string | null;
    members: StructMember[];
}

export type StructMember = VariableDecl | FunctionDecl | ResponsibleBlock;

export interface ResponsibleBlock extends NodeBase {
    type: 'ResponsibleBlock';
    owns: string[]; // identifiers struct is responsible for freeing
    cleanup: Block | null; // optional action block
}

// ===== Types (these are type ANNOTATIONS, separate AST family from expressions) =====
export type TypeNode =
    | ({ type: 'BaseType'; name: string } & NodeBase)
    | ({ type: 'NullableType'; inner: TypeNode } & NodeBase)
    | ({ type: 'ArrayType'; element: TypeNode } & NodeBase)
    | ({ type: 'MapType'; key: TypeNode; value: TypeNode } & NodeBase)
    | ({ type: 'TupleType'; elements: TypeNode[] } & NodeBase)
    | ({ type: 'ResultType'; ok: TypeNode; err: TypeNode } & NodeBase)
    | ({
          type: 'GenericType';
          name: string;
          typeArg: TypeNode | null;
      } & NodeBase);

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
    | NullLiteral
    | TupleLiteral
    | ArrayLiteral
    | MapLiteral
    | IndexExpr;

export interface RangeExpr extends NodeBase {
    type: 'RangeExpr';
    inclusive: boolean; // false = .. , true = ..=
    start: Expression;
    end: Expression;
}

export interface IndexExpr extends NodeBase {
    type: 'IndexExpr';
    object: Expression;
    index: Expression;
}

export interface BinaryExpr extends NodeBase {
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

export interface UnaryExpr extends NodeBase {
    type: 'UnaryExpr';
    operator: '!' | '-';
    operand: Expression;
}

export interface NullCheckExpr extends NodeBase {
    type: 'NullCheckExpr';
    expression: Expression;
}

export interface MemberAccess extends NodeBase {
    type: 'MemberAccess';
    object: Expression;
    property: string;
}
export interface MethodCall extends NodeBase {
    type: 'MethodCall';
    object: Expression;
    method: string;
    args: Expression[];
    builtInReciever?: OrbType;
    struct?: { kind: 'struct'; name: string };
}

export interface FunctionCall extends NodeBase {
    type: 'FunctionCall';
    name: string;
    args: Expression[];
    builtin?: boolean;
}

export interface StructInit extends NodeBase {
    type: 'StructInit';
    name: string;
    fields: FieldInit[];
}
export interface FieldInit extends NodeBase {
    type: 'FieldInit';
    name: string;
    value: Expression;
}

export interface Identifier extends NodeBase {
    type: 'Identifier';
    name: string;
}

export type Literal = IntLiteral | FloatLiteral | StrLiteral | BoolLiteral;
export interface IntLiteral extends NodeBase {
    type: 'IntLiteral';
    value: string;
}
export interface FloatLiteral extends NodeBase {
    type: 'FloatLiteral';
    value: string;
}
export interface StrLiteral extends NodeBase {
    type: 'StrLiteral';
    value: string;
}
export interface BoolLiteral extends NodeBase {
    type: 'BoolLiteral';
    value: boolean;
}
export interface NullLiteral extends NodeBase {
    type: 'NullLiteral';
}

export interface ArrayLiteral extends NodeBase {
    type: 'ArrayLiteral';
    elements: Expression[];
}

export interface MapLiteral extends NodeBase {
    type: 'MapLiteral';
    elements: { key: string; value: Expression }[];
}

export interface TupleLiteral extends NodeBase {
    type: 'TupleLiteral';
    elements: Expression[];
}
