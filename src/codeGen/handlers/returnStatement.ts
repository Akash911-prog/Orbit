import type { ReturnStatement } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateReturnstream(
    node: ReturnStatement,
    ctx: CodeGenContext
): void {
    ctx.stream.write('return ');
    ctx.generate(node.value, ctx);
    ctx.stream.write(';\n');
}
