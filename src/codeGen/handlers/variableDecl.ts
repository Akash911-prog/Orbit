import type { VariableDecl } from '../../parser/nodeTypes';
import fs from 'node:fs';
import { variableDeclTemplate } from '../constants';
import { orbTypeToCType } from '../helper';
import { generateExpressionStream } from './expressions';

export function generateVariableDeclStream(
    node: VariableDecl,
    stream: fs.WriteStream
): void {
    if (!node.resolvedType) {
        throw new Error('Variable type not resolved');
    }
    stream.write(
        variableDeclTemplate(node.name, orbTypeToCType(node.resolvedType))
    );
    if (node.initializer) generateExpressionStream(node.initializer, stream);
    stream.write(';\n');
}
