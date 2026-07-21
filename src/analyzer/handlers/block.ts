// block.ts
import type { Block } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function processBlockBody(node: Block, ctx: AnalyzerContext): OrbType {
    for (const stmt of node.statements) {
        ctx.visit(stmt, ctx);
    }
    ctx.scope.table.forEach((entry) => {
        if (entry.kind === 'variable' && !entry.moved && !entry.type.copyable) {
            node.needFree.push(entry);
        }
    });
    return OrbTypes.void();
}

export function handleBlock(node: Block, ctx: AnalyzerContext): OrbType {
    const parentScope = ctx.scope;
    ctx.scope = ctx.scope.enterScope();
    const result = processBlockBody(node, ctx);
    ctx.scope = parentScope;
    return result;
}
