import type { Expression } from '../../parser/nodeTypes';
import fs from 'node:fs';
import type { CodeGenContext } from '../context';

export function generateExpressionStream(
    node: Expression,
    ctx: CodeGenContext
): void {
    switch (node.type) {
        case 'IntLiteral':
            // TODO: stream.write(node.value)
            break;

        case 'FloatLiteral':
            // TODO: stream.write(node.value) — check for 'f' suffix if using float vs double
            break;

        case 'StrLiteral':
            // TODO: emit as a C string literal, escape quotes/backslashes
            break;

        case 'BoolLiteral':
            // TODO: stream.write(node.value ? 'true' : 'false')
            break;

        case 'NullLiteral':
            // TODO: depends on nullable representation — e.g. { .has_value = false }
            break;

        case 'Identifier':
            // TODO: stream.write(node.name)
            break;

        case 'BinaryExpr':
            // TODO: check node.isStringConcat -> orb_string_concat(...) vs `(left OP right)`
            break;

        case 'UnaryExpr':
            // TODO: stream.write(node.operator), then recurse into node.operand
            break;

        case 'NullCheckExpr':
            // TODO: emit nullable's .has_value check, e.g. `(expr.has_value)`
            break;

        case 'RangeExpr':
            // TODO: ranges probably don't emit standalone — likely only valid inside a ForStatement's iterable
            break;

        case 'MemberAccess':
            // TODO: recurse into node.object, then `.` + node.property (or `->` if self is ever a pointer)
            break;

        case 'MethodCall':
            // TODO: check node.builtinReceiverType -> BUILTIN_CODEGEN[...].emitCall(...)
            //       else -> StructName_methodName(object, ...args) using node.object's resolvedType
            break;

        case 'FunctionCall':
            // TODO: stream.write(node.name + '('), comma-separated args, ')'
            break;

        case 'StructInit':
            // TODO: emit C compound literal, e.g. (Point){ .x = 1, .y = 2 }
            break;

        case 'ArrayLiteral':
            // TODO: emit constructor call building the Arr_X struct, or a helper like orb_Arr_X_from(...)
            break;

        case 'TupleLiteral':
            // TODO: emit compound literal for the tuple's synthesized struct, e.g. (Tuple_int_str){ ._0 = .., ._1 = .. }
            break;

        case 'MapLiteral':
            // TODO: likely a sequence of orb_Map_X_set(...) calls, or a builder helper — maps deferred past MVP per earlier scoping
            break;

        case 'IndexExpr':
            // TODO: recurse into node.object, then `[]` + node.index
            break;

        default: {
            // exhaustiveness guard — if this fires, a new Expression variant was added
            // to types.ts without a matching case here
            const _exhaustive: never = node;
            throw new Error(`Unhandled expression node: ${(node as any).type}`);
        }
    }
}
