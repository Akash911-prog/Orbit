import type { ExpressionStatement } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleExpressionStatement(
    node: ExpressionStatement,
    ctx: AnalyzerContext
): OrbType {
    throw new Error('Method not implemented.');
}
