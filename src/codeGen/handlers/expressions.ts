import type { Expression } from '../../parser/nodeTypes';
import fs from 'node:fs';
import type { CodeGenContext } from '../context';

export function generateExpressionStream(
    node: Expression,
    ctx: CodeGenContext
) {
    throw new Error('Function not implemented.');
}
