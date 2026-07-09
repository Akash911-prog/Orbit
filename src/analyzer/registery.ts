import { OrbTypes, type OrbType } from '../types';
import type { AnalyzerContext } from './context';
import { handleAssignment } from './handlers/assignment';
import { handleBlock } from './handlers/block';
import { handleExpression } from './handlers/expression';
import { handleExpressionStatement } from './handlers/expressionStatement';
import { handleForStatement } from './handlers/for';
import { handleFunctionDecl } from './handlers/functionDecl';
import { handleIfStatement } from './handlers/ifStatement';
import { handleLoopStatement } from './handlers/loop';
import { handleOrbit } from './handlers/orbit';
import { handleProgram } from './handlers/program';
import { handleReturnStatement } from './handlers/returnStatement';
import { handleStructDecl } from './handlers/structDecl';
import { handleVariableDecl } from './handlers/variabledecl';
import { handleWhileStatement } from './handlers/whileStatement';

export type HandlerFn = (node: any, ctx: AnalyzerContext) => OrbType;
export const HandlerRegistry: Record<string, HandlerFn> = {
    Program: handleProgram,
    // Declarations
    VariableDecl: handleVariableDecl,
    FunctionDecl: handleFunctionDecl,
    StructDecl: handleStructDecl,

    // Statements
    Block: handleBlock,
    IfStatement: handleIfStatement,
    WhileStatement: handleWhileStatement,
    ReturnStatement: handleReturnStatement,
    Assignment: handleAssignment,
    ExpressionStatement: handleExpressionStatement,
    LoopStatement: handleLoopStatement,
    ForStatement: handleForStatement,

    // Expressions — all fold into the single recursive dispatcher
    IntLiteral: handleExpression,
    FloatLiteral: handleExpression,
    StrLiteral: handleExpression,
    BoolLiteral: handleExpression,
    NullLiteral: handleExpression,
    Identifier: handleExpression,
    BinaryExpr: handleExpression,
    UnaryExpr: handleExpression,
    NullCheckExpr: handleExpression,
    RangeExpr: handleExpression,
    MemberAccess: handleExpression,
    MethodCall: handleExpression,
    FunctionCall: handleExpression,
    StructInit: handleExpression,

    RootOrbitDecl: handleOrbit,
    OrbitDecl: handleOrbit,
};

export type BuiltinMethodSig = {
    // computes expected param types given the concrete receiver (e.g. array<int> vs array<str>)
    params: (receiver: OrbType, argCount: number) => OrbType[] | null;
    returnType: (receiver: OrbType) => OrbType;
};

export const BuiltinMethods: Partial<
    Record<OrbType['kind'], Record<string, BuiltinMethodSig>>
> = {
    array: {
        push: {
            params: (recv, argCount) => [
                recv.kind === 'array' ? recv.element : OrbTypes.unknown(),
            ],
            returnType: () => OrbTypes.void(),
        },
        length: {
            params: (recv, argCount) => [],
            returnType: () => OrbTypes.int(),
        },
        pop: {
            params: (reciever, argCount) => {
                if (argCount === 0) return [];
                if (argCount === 1) return [OrbTypes.int()];
                return null;
            },
            returnType: (receiver) => {
                if (receiver.kind === 'array') return receiver.element;
                return OrbTypes.unknown();
            },
        },
    },

    tuple: {
        length: {
            params: () => [],
            returnType: () => OrbTypes.int(),
        },
        copy: {
            params: () => [],
            returnType: (reciever) =>
                reciever.kind === 'tuple'
                    ? OrbTypes.tuple(reciever.elements)
                    : OrbTypes.unknown(),
        },
    },
};
