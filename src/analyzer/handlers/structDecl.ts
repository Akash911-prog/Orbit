import type { StructDecl } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleStructDecl(
    node: StructDecl,
    ctx: AnalyzerContext
): OrbType {
    throw new Error('Function not implemented.');
}
