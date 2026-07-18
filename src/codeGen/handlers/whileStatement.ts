import type { WhileStatement } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateWhilestream(
    node: WhileStatement,
    ctx: CodeGenContext
): void {
    ctx.stream.write('while (');
    ctx.generate(node.condition, ctx);
    ctx.stream.write(') ');
    ctx.generate(node.body, ctx);
}
