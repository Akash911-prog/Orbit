import type { Block } from '../../parser/nodeTypes';
import { BuiltInMethodTemplate } from '../constants';
import type { CodeGenContext } from '../context';
import { getShapeKey } from '../helper';

export function generateBlockStream(node: Block, ctx: CodeGenContext): void {
    const parent = ctx.scope;
    ctx.scope = ctx.scope.child ? ctx.scope.child : ctx.scope;
    for (const stmt of node.statements) {
        ctx.generate(stmt, ctx);
    }

    node.needFree.forEach((entry) => {
        if (entry.kind !== 'variable') return;
        switch (entry.type.kind) {
            case 'array': {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.free.open(
                        getShapeKey(entry.type)
                    )
                );
                ctx.stream.write(entry.name);
                ctx.stream.write(BuiltInMethodTemplate.array.free.close());
                ctx.stream.write(`;\n`);
                break;
            }
            default: {
                ctx.stream.write(`free(${entry.name});\n`);
            }
        }
    });

    ctx.scope = parent;
}
