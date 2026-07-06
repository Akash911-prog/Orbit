import type { VariableDecl } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { handleExpression } from './expression';

export function handleVariableDecl(
    node: VariableDecl,
    ctx: AnalyzerContext
): OrbType {
    const varType = handleExpression(node.initializer, ctx);
    ctx.scope.define(node.name, {
        kind: 'variable',
        name: node.name,
        type: varType,
        mutable: node.kind === 'var',
    });
    return varType;
}
