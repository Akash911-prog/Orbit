import type { ForStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleForStatement(
    node: ForStatement,
    ctx: AnalyzerContext
): OrbType {
    const expressionType = ctx.visit(node.iterable, ctx);
    if (!expressionType.iterable) {
        ctx.reportError(
            `${expressionType.kind} Does not have an iterator`,
            node
        );
        return OrbTypes.unknown();
    }
    ctx.visit(node.body, ctx);
    return OrbTypes.void();
}
