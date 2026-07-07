import type { ExpressionStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleExpressionStatement(
    node: ExpressionStatement,
    ctx: AnalyzerContext
): OrbType {
    ctx.visit(node.expression, ctx);
    return OrbTypes.void();
}
