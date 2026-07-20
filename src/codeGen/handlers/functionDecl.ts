import type { FunctionDecl } from '../../parser/nodeTypes';
import type { CodeGenContext } from '../context';
import { addPrefix, orbTypeToCType } from '../helper';

export function generateFuncDeclstream(
    node: FunctionDecl,
    ctx: CodeGenContext
): void {
    const funcEntry = ctx.scope.lookupLocal(node.name);
    if (!funcEntry || funcEntry.kind !== 'function') return;
    ctx.stream.write(
        `${orbTypeToCType(funcEntry.returnType)} ${addPrefix(node.name, funcEntry.builtin, node.struct)}(`
    );
    funcEntry.params.forEach((param, i) => {
        ctx.stream.write(
            `${orbTypeToCType(param.type)} ${param.type.copyable ? '' : '*'}${param.name}`
        );
        if (i < funcEntry.params.length - 1) {
            ctx.stream.write(', ');
        }
    });
    ctx.stream.write(') {\n');
    ctx.generate(node.body, ctx);
    ctx.stream.write('}\n');
}
