import type { Program } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateProgramStream(
    node: Program,
    ctx: CodeGenContext
): void {
    for (const decl of node.declarations) {
        if (decl.type === 'StructDecl') continue;
        ctx.generate(decl, ctx);
    }
}
