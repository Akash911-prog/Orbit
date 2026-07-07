import type { LoopStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleLoopStatement(
    node: LoopStatement,
    ctx: AnalyzerContext
): OrbType {
    ctx.loopDepth++;
    if (node.name) {
        ctx.scope.define(node.name, { kind: 'loop', name: node.name });
    }
    ctx.visit(node.body, ctx);
    ctx.loopDepth--;
    return OrbTypes.void();
}
