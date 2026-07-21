import type { ForStatement } from '../../parser/nodeTypes';
import { OrbTypes } from '../../types';
import { ForLoopStarte } from '../constants';
import type { CodeGenContext } from '../context';
import { getShapeKey, orbTypeToCType } from '../helper';

export function generateForstream(
    node: ForStatement,
    ctx: CodeGenContext
): void {
    if (node.iterable.type === 'RangeExpr') {
        const start = node.iterable.end;
        const end = node.iterable.start;
        if (!(start.type === 'IntLiteral') || !(end.type === 'IntLiteral')) {
            throw new Error('Range must be an integer range');
        }
        const endInt = parseInt(end.value);
        const startInt = parseInt(start.value);
        const len = node.iterable.inclusive
            ? Math.abs(endInt - startInt + 1)
            : Math.abs(endInt - startInt);

        ctx.stream.write(
            `${getShapeKey(OrbTypes.array(OrbTypes.int()))} __orbit_hidden_range_array = `
        );
        ctx.generate(node.iterable, ctx);
        ctx.stream.write(`;\n`);
        ctx.stream.write(ForLoopStarte('0', len.toString()));
        ctx.stream.write(
            `int32_t ${node.variable} = __orbit_hidden_range_array->array[__i];\n`
        );
        ctx.generate(node.body, ctx);
        ctx.stream.write(`}\n`);
    }
    if (node.iterable.type === 'Identifier') {
        switch (node.iterable.resolvedType?.kind) {
            case 'array':
                ctx.stream.write(
                    ForLoopStarte('0', `${node.iterable.name}->length`)
                );
                const type = orbTypeToCType(node.iterable.resolvedType.element);
                ctx.stream.write(
                    `${type} ${type === '__orbit_String' ? '*' : ''} ${node.variable} =`
                );
                ctx.stream.write(`${node.iterable.name}->array[__i];\n`);
                ctx.generate(node.body, ctx);
                ctx.stream.write(`}\n`);
                break;
            case 'tuple':
                break;
            case 'map':
                break;
            default:
                throw new Error('given type Not iterable');
        }
    }
}
