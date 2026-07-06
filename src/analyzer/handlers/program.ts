import type { Program } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleProgram(node: Program, ctx: AnalyzerContext): OrbType {
    for (const decl of node.declarations) {
        ctx.visit(decl, ctx);
    }
    return OrbTypes.void();
}
