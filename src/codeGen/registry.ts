import type { TopLevelDeclaration } from '../parser/nodeTypes';
import type { CodeGenContext } from './context';
import { generateAssignmentStream } from './handlers/assignment';
import { generateBlockStream } from './handlers/block';
import { generateExpressionStream } from './handlers/expressions';
import { generateForstream } from './handlers/for';
import { generateFuncDeclstream } from './handlers/functionDecl';
import { generateIfstream } from './handlers/ifStatement';
import { generateOrbitStream } from './handlers/orbit';
import { generateProgramStream } from './handlers/program';
import { generateReturnstream } from './handlers/returnStatement';
import { generateVariableDeclStream } from './handlers/variableDecl';
import { generateWhilestream } from './handlers/whileStatement';

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

    // orbit
    RootOrbitDecl: generateOrbitStream,
    OrbitBlock: generateOrbitStream,

    // statements
    IfStatement: generateIfstream,
    WhileStatement: generateWhilestream,
    ReturnStatement: generateReturnstream,
    FunctionDecl: generateFuncDeclstream,
    ForStatement: generateForstream,

    Block: generateBlockStream,
    Assignment: generateAssignmentStream,
};
