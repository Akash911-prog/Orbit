import type { Expression, ExpressionStatement } from '../../parser/nodeTypes';
import { CodeGenBuiltInMethods, StringMethods } from '../builtInMethods';
import {
    BuiltInMethodTemplate,
    RangeMethods,
    structMethodNameTemplate,
} from '../constants';
import type { CodeGenContext } from '../context';
import { addPrefix, getShapeKey, orbTypeToCType } from '../helper';

export function generateExpressionStream(
    node: Expression,
    ctx: CodeGenContext
): void {
    switch (node.type) {
        case 'IntLiteral':
            ctx.stream.write(`${node.value}`);
            break;

        case 'FloatLiteral':
            ctx.stream.write(`${node.value}`);
            break;

        case 'StrLiteral':
            ctx.stream.write(`"${node.value}"`);
            break;

        case 'BoolLiteral':
            ctx.stream.write(`${node.value ? 'true' : 'false'}`);
            break;

        case 'NullLiteral':
            ctx.stream.write('NULL');
            break;

        case 'Identifier':
            ctx.stream.write(node.name);
            break;

        case 'BinaryExpr':
            if (node.isStringConcat) {
                ctx.stream.write(StringMethods.concat.open());
                ctx.generate(node.left, ctx);
                ctx.stream.write(StringMethods.concat.sep());
                ctx.generate(node.right, ctx);
                ctx.stream.write(StringMethods.concat.close());
            } else {
                ctx.generate(node.left, ctx);
                ctx.stream.write(` ${node.operator} `);
                ctx.generate(node.right, ctx);
            }
            break;

        case 'UnaryExpr':
            ctx.stream.write(`${node.operator}`);
            ctx.generate(node.operand, ctx);
            break;

        case 'NullCheckExpr':
            ctx.stream.write('(');
            ctx.generate(node.expression, ctx);
            ctx.stream.write(')');
            ctx.stream.write('.');
            ctx.stream.write('is_null');
            break;

        case 'RangeExpr':
            ctx.stream.write(RangeMethods.emitCall.open());
            ctx.generate(node.start, ctx);
            ctx.stream.write(RangeMethods.emitCall.sep());
            ctx.generate(node.end, ctx);
            ctx.stream.write(RangeMethods.emitCall.sep());
            ctx.stream.write(`${node.inclusive ? 'true' : 'false'}`);
            ctx.stream.write(RangeMethods.emitCall.close());
            break;

        case 'MemberAccess':
            ctx.generate(node.object, ctx);
            ctx.stream.write(node.object.resolvedType?.copyable ? '.' : '->');
            ctx.stream.write(node.property);
            break;

        case 'MethodCall':
            if (node.builtInReciever) {
                const methodTable =
                    CodeGenBuiltInMethods[node.builtInReciever.kind];
                if (methodTable) {
                    const entry = methodTable[node.method];
                    if (entry) {
                        const shapeInfo = ctx.shapeInfo.get(
                            getShapeKey(node.builtInReciever)
                        );
                        if (!shapeInfo) throw new Error('no shape info');
                        entry.emitCall(shapeInfo, node, ctx);
                    }
                }
            } else if (node.struct) {
                ctx.stream.write(
                    structMethodNameTemplate.open(node.struct.name, node.method)
                );
                ctx.generate(node.object, ctx);
                for (const arg of node.args) {
                    ctx.generate(arg, ctx);
                    ctx.stream.write(', ');
                }
                ctx.stream.write(structMethodNameTemplate.close());
            }
            break;

        case 'FunctionCall':
            ctx.stream.write(addPrefix(node.name, node.builtin));
            ctx.stream.write('(');
            for (const arg of node.args) {
                ctx.generate(arg, ctx);
                ctx.stream.write(', ');
            }
            ctx.stream.write(')');
            break;

        case 'StructInit':
            ctx.stream.write('(');
            ctx.stream.write(`__orbit_struct_${node.name}`);
            ctx.stream.write(')');
            ctx.stream.write('{ ');
            for (const field of node.fields) {
                if (field.name === '_') continue;
                ctx.stream.write('.');
                ctx.stream.write(field.name);
                ctx.stream.write(' = ');
                ctx.generate(field.value, ctx);
                ctx.stream.write(', ');
            }
            ctx.stream.write('}');
            break;

        case 'ArrayLiteral':
            if (!node.resolvedType || node.resolvedType.kind !== 'array')
                throw new Error('Array type not resolved');
            ctx.stream.write(
                BuiltInMethodTemplate.array.create.open(
                    getShapeKey(node.resolvedType)
                )
            );
            const size = node.elements.length;
            ctx.stream.write(`${size}, `);
            ctx.stream.write(
                `(${orbTypeToCType(node.resolvedType.element)}[])`
            );
            ctx.stream.write('{ ');
            for (const element of node.elements) {
                ctx.generate(element, ctx);
                ctx.stream.write(', ');
            }
            ctx.stream.write('}, ');
            ctx.stream.write(`${size}`);
            ctx.stream.write(BuiltInMethodTemplate.array.create.close());
            break;

        case 'TupleLiteral':
            // TODO: emit compound literal for the tuple's synthesized struct, e.g. (Tuple_int_str){ ._0 = .., ._1 = .. }
            break;

        case 'MapLiteral':
            // TODO: likely a sequence of orb_Map_X_set(...) calls, or a builder helper — maps deferred past MVP per earlier scoping
            break;

        case 'IndexExpr':
            ctx.generate(node.object, ctx);
            ctx.stream.write('[');
            ctx.generate(node.index, ctx);
            ctx.stream.write(']');
            break;

        default: {
            // exhaustiveness guard — if this fires, a new Expression variant was added
            // to types.ts without a matching case here
            const _exhaustive: never = node;
            throw new Error(`Unhandled expression node: ${(node as any).type}`);
        }
    }
}
