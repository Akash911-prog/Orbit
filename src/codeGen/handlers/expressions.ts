import type { Expression } from '../../parser/nodeTypes';
import fs from 'node:fs';

export function generateExpressionStream(
    node: Expression,
    stream: fs.WriteStream
) {
    throw new Error('Function not implemented.');
}
