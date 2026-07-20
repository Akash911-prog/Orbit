import type { OrbitBlock, RootOrbitDecl } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';

export function generateOrbitStream(
    node: RootOrbitDecl | OrbitBlock,
    ctx: CodeGenContext
): void {
    switch (node.type) {
        case 'OrbitBlock':
            ctx.generate(node.body, ctx);
            break;
        case 'RootOrbitDecl':
            ctx.stream.write(`int main () {\n`);
            ctx.generate(node.body, ctx);
            ctx.stream.write('  return 0;\n}\n');
            break;
    }
}
