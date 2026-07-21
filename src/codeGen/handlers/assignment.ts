import type { Assignment } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateAssignmentStream(
    node: Assignment,
    ctx: CodeGenContext
): void {
    node.target.forEach((name, i) => {
        ctx.stream.write(name);
        if (i < node.target.length - 1)
            ctx.stream.write(node.targetCopyable ? '.' : '->');
    });

    ctx.stream.write(' = ');
    ctx.generate(node.value, ctx);
    ctx.stream.write(';\n');
}
