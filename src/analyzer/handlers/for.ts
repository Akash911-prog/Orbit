import type { ForStatement } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleForStatement(
    node: ForStatement,
    ctx: AnalyzerContext
): OrbType {
    throw new Error('Function not implemented.');
}
