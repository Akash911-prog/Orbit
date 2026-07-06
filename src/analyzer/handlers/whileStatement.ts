import type { WhileStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { expectType } from '../helper';

export function handleWhileStatement(
    node: WhileStatement,
    ctx: AnalyzerContext
): OrbType {
    const condType = ctx.visit(node.condition, ctx);
    expectType(OrbTypes.bool(), condType, node, ctx);
    ctx.loopDepth++;
    ctx.visit(node.body, ctx);
    ctx.loopDepth--;
    return OrbTypes.void();
}
