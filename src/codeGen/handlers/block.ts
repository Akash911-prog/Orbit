import type { Block } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateBlockStream(node: Block, ctx: CodeGenContext): void {
    for (const stmt of node.statements) {
        ctx.generate(stmt, ctx);
    }

    node.needFree.forEach((entry) => {
        if (entry.kind !== 'variable') return;
        ctx.stream.write(`free(${entry.name});\n`);
    });
}
