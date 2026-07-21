import type { VariableDecl } from '../../parser/nodeTypes';
import { variableDeclTemplate } from '../constants';
import { getShapeKey, orbTypeToCType } from '../helper';
import type { CodeGenContext } from '../context';

export function generateVariableDeclStream(
    node: VariableDecl,
    ctx: CodeGenContext
): void {
    if (!node.resolvedType) {
        throw new Error('Variable type not resolved');
    }
    ctx.stream.write(
        variableDeclTemplate(
            node.name,
            orbTypeToCType(node.resolvedType),
            !node.resolvedType.copyable
        )
    );
    if (
        node.resolvedType.kind === 'nullable' &&
        node.initializer?.resolvedType?.kind === 'null'
    ) {
        ctx.stream.write(' = ');
        ctx.stream.write(`${getShapeKey(node.resolvedType)}_create_null()`);
    } else if (node.resolvedType.kind === 'nullable') {
        ctx.stream.write(' = ');
        ctx.stream.write(`${getShapeKey(node.resolvedType)}_create_value(`);
        ctx.generate(node.initializer, ctx);
        ctx.stream.write(')');
    }
    if (node.initializer && node.resolvedType.kind !== 'nullable') {
        ctx.stream.write(' = ');
        ctx.generate(node.initializer, ctx);
    }
    ctx.stream.write(';\n');
}
