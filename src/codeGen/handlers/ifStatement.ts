import type { IfStatement } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateIfstream(node: IfStatement, ctx: CodeGenContext): void {
    ctx.stream.write(`if (`);
    ctx.generate(node.condition, ctx);
    ctx.stream.write(`) {\n`);
    ctx.generate(node.thenBranch, ctx);
    ctx.stream.write(`}\n`);
    if (node.elseBranch) {
        if (node.elseBranch.type === 'IfStatement') {
            ctx.generate(node.elseBranch, ctx);
        } else {
            ctx.stream.write(`else {\n`);
            ctx.generate(node.elseBranch, ctx);
            ctx.stream.write(`}\n`);
        }
    }
}
