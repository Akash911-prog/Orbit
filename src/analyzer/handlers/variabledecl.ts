import type { VariableDecl } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { isAssignable, resolveVariableType } from '../helper';
import { handleExpression } from './expression';

export function handleVariableDecl(
    node: VariableDecl,
    ctx: AnalyzerContext
): OrbType {
    const type = resolveVariableType(node, ctx);
    const defined = ctx.scope.define(node.name, {
        kind: 'variable',
        name: node.name,
        type,
        mutable: node.kind === 'var',
    });
    if (!defined)
        ctx.reportError(
            `'${node.name}' is already defined in this scope`,
            node
        );
    node.resolvedType = type;
    return type;
}
