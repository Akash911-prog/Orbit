import type { TopLevelDeclaration } from '../parser/nodeTypes';
import type { CodeGenContext } from './context';
import { generateExpressionStream } from './handlers/expressions';
import { generateOrbitStream } from './handlers/orbit';
import { generateProgramStream } from './handlers/program';
import { generateVariableDeclStream } from './handlers/variableDecl';

export type CodeGenHandlerFn = (node: any, ctx: CodeGenContext) => void;

export const HandlerRegistry: Record<string, CodeGenHandlerFn> = {
    Program: generateProgramStream,
    VariableDecl: generateVariableDeclStream,
    ExpressionStatement: (node, ctx) => ctx.generate(node.expression, ctx),
    Expression: generateExpressionStream,

    // all expressions
    IntLiteral: generateExpressionStream,
    FloatLiteral: generateExpressionStream,
    StrLiteral: generateExpressionStream,
    BoolLiteral: generateExpressionStream,
    NullLiteral: generateExpressionStream,
    Identifier: generateExpressionStream,
    BinaryExpr: generateExpressionStream,
    UnaryExpr: generateExpressionStream,
    NullCheckExpr: generateExpressionStream,
    RangeExpr: generateExpressionStream,
    MemberAccess: generateExpressionStream,
    MethodCall: generateExpressionStream,
    FunctionCall: generateExpressionStream,
    StructInit: generateExpressionStream,
    ArrayLiteral: generateExpressionStream,
    MapLiteral: generateExpressionStream,
    TupleLiteral: generateExpressionStream,

    RootOrbitDecl: generateOrbitStream,
    OrbitBlock: generateOrbitStream,
};
