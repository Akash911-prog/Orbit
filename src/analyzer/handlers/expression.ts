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
    ArrayLiteral,
    MapLiteral,
    TupleLiteral,
} from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { expectNumeric, expectType, isAssignable, typesEqual } from '../helper';
import { BuiltinMethods } from '../registery';
import { handleIndexExpr } from './indexExpr';

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

        case 'ArrayLiteral':
            resolvedType = handleArrayLiteral(node, ctx);
            break;

        case 'MapLiteral':
            resolvedType = handleMapLiteral(node, ctx);
            break;

        case 'TupleLiteral':
            resolvedType = handleTupleLiteral(node, ctx);
            break;

        case 'IndexExpr':
            resolvedType = handleIndexExpr(node, ctx);
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
    const objType = ctx.visit(node.object, ctx);

    if (objType.kind === 'unknown') return OrbTypes.unknown();

    if (objType.kind !== 'struct') {
        ctx.reportError(
            `Cannot access field '${node.property}' of non-struct type`,
            node
        );
        return OrbTypes.unknown();
    }

    const structEntry = ctx.scope.lookup(objType.name!);
    if (!structEntry || structEntry.kind !== 'struct') {
        ctx.reportError(`Undefined struct '${objType.name}'`, node);
        return OrbTypes.unknown();
    }

    const field = structEntry.fields.find((f) => f.name === node.property);
    if (!field) {
        ctx.reportError(
            `Struct '${objType.name}' does not have field '${node.property}'`,
            node
        );
        return OrbTypes.unknown();
    }
    return field.type;
}

function handleMethodCall(node: MethodCall, ctx: AnalyzerContext): OrbType {
    const objType = ctx.visit(node.object, ctx);

    if (objType.kind === 'unknown') return OrbTypes.unknown();

    const methodTable = BuiltinMethods[objType.kind];
    if (methodTable) {
        const sig = methodTable[node.method];
        node.builtInReciever = objType;
        if (!sig) {
            ctx.reportError(
                `Struct '${objType.kind}' does not have method '${node.method}'`,
                node
            );
            return OrbTypes.unknown();
        }
        const expectedParams = sig.params(objType, node.args.length);
        if (!expectedParams) {
            ctx.reportError(
                `Method '${node.method}' does not expects ${node.args.length} arguments`,
                node
            );
            return OrbTypes.unknown();
        }
        node.args.forEach((arg, i) => {
            const paramType = expectedParams[i]!;
            const argType = ctx.visit(arg, ctx);
            if (!isAssignable(argType, paramType)) {
                ctx.reportError(
                    `Cannot pass argument of type ${argType.kind} to parameter of type ${paramType.kind}`,
                    node
                );
            }
        });

        return sig.returnType(objType);
    }

    if (objType.kind !== 'struct') {
        ctx.reportError(
            `Cannot access field '${node.method}' of non-struct type`,
            node
        );
        return OrbTypes.unknown();
    }

    const structEntry = ctx.scope.lookup(objType.name!);
    if (!structEntry || structEntry.kind !== 'struct') {
        ctx.reportError(`Undefined struct '${objType.name}'`, node);
        return OrbTypes.unknown();
    }

    const method = structEntry.methods.find((m) => m.name === node.method);
    if (!method) {
        ctx.reportError(
            `Struct '${objType.name}' does not have method '${node.method}'`,
            node
        );
        return OrbTypes.unknown();
    }

    const expectedParams = method.params.slice(1);
    if (node.args.length !== expectedParams.length) {
        ctx.reportError(
            `Method '${node.method}' expects ${expectedParams.length} arguments, got ${node.args.length}`,
            node
        );
        return OrbTypes.unknown();
    }

    node.args.forEach((arg, i) => {
        const paramType = expectedParams[i]!.type;
        const argType = ctx.visit(arg, ctx);
        if (!isAssignable(argType, paramType)) {
            ctx.reportError(
                `Cannot pass argument of type ${argType.kind} to parameter of type ${paramType.kind}`,
                node
            );
        }
    });

    return method.returnType;
}

function handleFunctionCall(node: FunctionCall, ctx: AnalyzerContext): OrbType {
    const funcEntry = ctx.scope.lookup(node.name);
    if (!funcEntry) {
        ctx.reportError(`Undefined function '${node.name}'`, node);
        return OrbTypes.unknown();
    }

    if (funcEntry.kind !== 'function') {
        ctx.reportError(`'${node.name}' is not a function`, node);
        return OrbTypes.unknown();
    }

    const expectedParams = funcEntry.params;
    if (node.args.length !== expectedParams.length) {
        ctx.reportError(
            `Function '${node.name}' expects ${expectedParams.length} arguments, got ${node.args.length}`,
            node
        );
        return OrbTypes.unknown();
    }

    node.args.forEach((arg, i) => {
        const paramType = expectedParams[i]!.type;
        const argType = ctx.visit(arg, ctx);
        if (!isAssignable(argType, paramType)) {
            ctx.reportError(
                `Cannot pass argument of type ${argType.kind} to parameter of type ${paramType.kind}`,
                node
            );
        }
    });

    return funcEntry.returnType;
}

function handleStructInit(node: StructInit, ctx: AnalyzerContext): OrbType {
    const structEntry = ctx.globalScope.lookup(node.name);

    if (!structEntry || structEntry.kind !== 'struct') {
        ctx.reportError(`Unknown struct '${node.name}'`, node);
        return OrbTypes.unknown();
    }

    const providedNames = new Set<string>();

    for (const fieldInit of node.fields) {
        providedNames.add(fieldInit.name);

        const field = structEntry.fields.find((f) => f.name === fieldInit.name);
        if (!field) {
            ctx.reportError(
                `Struct '${node.name}' has no field '${fieldInit.name}'`,
                node
            );
            continue;
        }

        const valueType = ctx.visit(fieldInit.value, ctx);
        if (!isAssignable(valueType, field.type)) {
            ctx.reportError(
                `Cannot assign value of type ${valueType.kind} to field of type ${field.type.kind}`,
                node
            );
        }
    }

    // catch missing required fields
    const requiredFields = structEntry.fields.filter(
        (f) => f.type.kind !== 'nullable'
    );
    for (const field of requiredFields) {
        if (!providedNames.has(field.name)) {
            ctx.reportError(
                `Struct '${node.name}' requires field '${field.name}'`,
                node
            );
        }
    }

    return OrbTypes.struct(node.name);
}
function handleArrayLiteral(node: ArrayLiteral, ctx: AnalyzerContext): OrbType {
    let type: OrbType | null = null;
    for (const elements of node.elements) {
        if (type === null) {
            type = ctx.visit(elements, ctx);
            continue;
        }

        const elementType = ctx.visit(elements, ctx);
        if (!isAssignable(elementType, type)) {
            ctx.reportError(
                `Cannot assign value of type ${elementType.kind} to array of type ${type.kind}`,
                node
            );
        }
    }
    if (type === null) return OrbTypes.array(OrbTypes.unknown());

    return OrbTypes.array(type);
}

function handleMapLiteral(node: MapLiteral, ctx: AnalyzerContext): OrbType {
    let type: OrbType | null = null;
    for (const elements of node.elements) {
        if (type === null) {
            type = ctx.visit(elements.value, ctx);
            continue;
        }

        const elementType = ctx.visit(elements.value, ctx);
        if (!isAssignable(elementType, type)) {
            ctx.reportError(
                `Cannot assign value of type ${elementType.kind} to map value of type ${type.kind}`,
                node
            );
        }
    }
    if (type === null)
        return OrbTypes.map(OrbTypes.unknown(), OrbTypes.unknown());

    return OrbTypes.map(OrbTypes.str(), type);
}

function handleTupleLiteral(node: TupleLiteral, ctx: AnalyzerContext): OrbType {
    const elements: OrbType[] = [];
    for (const element of node.elements) {
        elements.push(ctx.visit(element, ctx));
    }
    return OrbTypes.tuple(elements);
}
