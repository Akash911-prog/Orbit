import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import type { IfStatement } from '../../parser/nodeTypes';
import { expectType } from '../helper';
import { handleBlock, processBlockBody } from './block';

export function handleIfStatement(
    node: IfStatement,
    ctx: AnalyzerContext
): OrbType {
    const condType = ctx.visit(node.condition, ctx);
    expectType(OrbTypes.bool(), condType, node, ctx);

    const parent = ctx.scope;
    ctx.scope = ctx.scope.enterScope();

    if (
        node.condition.type === 'NullCheckExpr' &&
        node.condition.expression.type === 'Identifier'
    ) {
        const entry = ctx.scope.lookup(node.condition.expression.name);
        if (entry?.kind === 'variable' && entry.type.kind === 'nullable') {
            ctx.scope.update(node.condition.expression.name, {
                ...entry,
                type: entry.type.inner,
            });
        }
    }

    processBlockBody(node.thenBranch, ctx);

    ctx.scope = parent;

    if (node.elseBranch) {
        ctx.visit(node.elseBranch, ctx);
    }

    return OrbTypes.void();
}
