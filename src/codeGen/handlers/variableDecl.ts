import type { VariableDecl } from '../../parser/nodeTypes';
import fs from 'node:fs';
import { variableDeclTemplate } from '../constants';
import { orbTypeToCType } from '../helper';
import { generateExpressionStream } from './expressions';
import type { CodeGenContext } from '../context';

export function generateVariableDeclStream(
    node: VariableDecl,
    ctx: CodeGenContext
): void {
    if (!node.resolvedType) {
        throw new Error('Variable type not resolved');
    }
    ctx.stream.write(
        variableDeclTemplate(node.name, orbTypeToCType(node.resolvedType))
    );
    if (node.initializer) {
        ctx.stream.write(' = ');
        ctx.generate(node.initializer, ctx);
    }
    ctx.stream.write(';\n');
}
