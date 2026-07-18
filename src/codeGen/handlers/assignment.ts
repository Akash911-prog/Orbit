import type { Assignment } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateAssignmentstream(
    node: Assignment,
    ctx: CodeGenContext
): void {
    node.target.forEach((name, i) => {
        ctx.stream.write(name);
        if (i < node.target.length - 1) ctx.stream.write('.');
    });

    ctx.stream.write(' = ');
    ctx.generate(node.value, ctx);
}
