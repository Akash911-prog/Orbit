import type { Block } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleBlock(node: Block, ctx: AnalyzerContext): OrbType {
    const parentScope = ctx.scope;
    ctx.scope = ctx.scope.enterScope();
    for (const stmt of node.statements) {
        ctx.visit(stmt, ctx);
    }
    ctx.scope = parentScope;
    return OrbTypes.void();
}
