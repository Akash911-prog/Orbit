import type { Assignment } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleAssignment(
    node: Assignment,
    ctx: AnalyzerContext
): OrbType {
    throw new Error('Method not implemented.');
}
