import type {
    BinaryExpr,
    Expression,
    Identifier,
    UnaryExpr,
    NullCheckExpr,
    RangeExpr,
    MemberAccess,
    MethodCall,
    FunctionCall,
    StructInit,
} from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { expectNumeric, expectType, typesEqual } from '../helper';

export function handleExpression(
    node: Expression,
    ctx: AnalyzerContext
): OrbType {
    let resolvedType: OrbType;

    switch (node.type) {
        case 'IntLiteral':
            resolvedType = OrbTypes.int();
            break;
        case 'FloatLiteral':
            resolvedType = OrbTypes.float();
            break;
        case 'StrLiteral':
            resolvedType = OrbTypes.str();
            break;
        case 'BoolLiteral':
            resolvedType = OrbTypes.bool();
            break;
        case 'NullLiteral':
            resolvedType = OrbTypes.null();
            break;

        case 'Identifier':
            resolvedType = handleIdentifier(node, ctx);
            break;

        case 'BinaryExpr':
            resolvedType = handleBinaryExpr(node, ctx);
            break;

        case 'UnaryExpr':
            resolvedType = handleUnaryExpr(node, ctx);
            break;

        case 'NullCheckExpr':
            resolvedType = handleNullCheckExpr(node, ctx);
            break;

        case 'RangeExpr':
            resolvedType = handleRangeExpr(node, ctx);
            break;

        case 'MemberAccess':
            resolvedType = handleMemberAccess(node, ctx);
            break;

        case 'MethodCall':
            resolvedType = handleMethodCall(node, ctx);
            break;

        case 'FunctionCall':
            resolvedType = handleFunctionCall(node, ctx);
            break;

        case 'StructInit':
            resolvedType = handleStructInit(node, ctx);
            break;

        default:
            ctx.reportError(`Unhandled expression node`, node);
            resolvedType = OrbTypes.unknown();
    }

    (node as any).resolvedType = resolvedType;
    return resolvedType;
}

function handleIdentifier(node: Identifier, ctx: AnalyzerContext): OrbType {
    const entry = ctx.scope.lookup(node.name);
    if (!entry) {
        ctx.reportError(`Undefined identifier '${node.name}'`, node);
        return OrbTypes.unknown();
    }
    if (entry.kind !== 'variable') {
        ctx.reportError(`'${node.name}' is not a variable`, node);
        return OrbTypes.unknown();
    }
    return entry.type;
}

function handleBinaryExpr(node: BinaryExpr, ctx: AnalyzerContext): OrbType {
    const leftType = handleExpression(node.left, ctx);
    const rightType = handleExpression(node.right, ctx);
    switch (node.operator) {
        case '&&':
        case '||':
            expectType(OrbTypes.bool(), leftType, node, ctx);
            expectType(OrbTypes.bool(), rightType, node, ctx);
            return OrbTypes.bool();

        case '!=':
        case '==':
            if (!typesEqual(leftType, rightType)) {
                ctx.reportError(
                    `Cannot compare types ${leftType.kind} and ${rightType.kind}`,
                    node
                );
            }
            return OrbTypes.bool();

        case '<=':
        case '<':
        case '>=':
        case '>':
            expectNumeric(leftType, node, ctx);
            expectNumeric(rightType, node, ctx);
            return OrbTypes.bool();

        case '+':
            // string concat vs arithmetic fork — decorate for codegen
            if (leftType.kind === 'str' && rightType.kind === 'str') {
                (node as any).isStringConcat = true;
                return OrbTypes.str();
            }
            if (
                expectNumeric(leftType, node, ctx) &&
                expectNumeric(rightType, node, ctx)
            ) {
                return leftType.kind === 'float' || rightType.kind === 'float'
                    ? OrbTypes.float()
                    : OrbTypes.int();
            }
            ctx.reportError(
                `Cannot add types ${leftType.kind} and ${rightType.kind}`,
                node
            );
            return OrbTypes.unknown();

        case '%':
        case '*':
        case '-':
        case '/':
            expectNumeric(leftType, node, ctx);
            expectNumeric(rightType, node, ctx);
            return OrbTypes.int();
        default:
            ctx.reportError(
                `Unhandled binary operator '${node.operator}'`,
                node
            );
            return OrbTypes.unknown();
    }
}

function handleUnaryExpr(node: UnaryExpr, ctx: AnalyzerContext): OrbType {
    const operandType = handleExpression(node.operand, ctx);
    switch (node.operator) {
        case '!':
            expectType(OrbTypes.bool(), operandType, node, ctx);
            return OrbTypes.bool();
        case '-':
            expectNumeric(operandType, node, ctx);
            return operandType.kind === 'float'
                ? OrbTypes.float()
                : OrbTypes.int();
        default:
            ctx.reportError(
                `Unhandled unary operator '${node.operator}'`,
                node
            );
            return OrbTypes.unknown();
    }
}

function handleNullCheckExpr(
    node: NullCheckExpr,
    ctx: AnalyzerContext
): OrbType {
    const innerType = handleExpression(node.expression, ctx);
    if (innerType.kind !== 'nullable') {
        ctx.reportError(`'? used on non-nullable type`, node);
        return OrbTypes.bool();
    }
    return OrbTypes.bool();
}

function handleRangeExpr(node: RangeExpr, ctx: AnalyzerContext): OrbType {
    const startType = handleExpression(node.start, ctx);
    const endType = handleExpression(node.end, ctx);
    expectType(OrbTypes.int(), startType, node, ctx);
    expectType(OrbTypes.int(), endType, node, ctx);
    return OrbTypes.array(OrbTypes.int());
}

function handleMemberAccess(node: MemberAccess, ctx: AnalyzerContext): OrbType {
    throw new Error('Function not implemented.');
}

function handleMethodCall(node: MethodCall, ctx: AnalyzerContext): OrbType {
    throw new Error('Function not implemented.');
}

function handleFunctionCall(node: FunctionCall, ctx: AnalyzerContext): OrbType {
    throw new Error('Function not implemented.');
}

function handleStructInit(node: StructInit, ctx: AnalyzerContext): OrbType {
    throw new Error('Function not implemented.');
}
