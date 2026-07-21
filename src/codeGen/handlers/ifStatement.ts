import type { IfStatement } from '../../parser/nodeTypes';
import type { OrbType } from '../../types';
import type { CodeGenContext } from '../context';
import { orbTypeToCType } from '../helper';

export function generateIfstream(node: IfStatement, ctx: CodeGenContext): void {
    ctx.stream.write(`if (`);
    ctx.generate(node.condition, ctx);
    ctx.stream.write(`) {\n`);

    if (node.condition.type === 'NullCheckExpr') {
        const name = node.condition.expression.name;
        const type = node.condition.expression.resolvedType?.inner as OrbType;
        const cType = orbTypeToCType(type);

        // read the outer nullable's value into a uniquely-named temp first,
        // BEFORE shadowing "name" — avoids the same-statement self-reference bug
        ctx.stream.write(`${cType} __orbit_narrow_${name} = ${name}.value;\n`);
        ctx.stream.write(`{\n`);
        ctx.stream.write(`${cType} ${name} = __orbit_narrow_${name};\n`);

        ctx.generate(node.thenBranch, ctx);

        ctx.stream.write(`}\n`); // close the shadow scope
    } else {
        ctx.generate(node.thenBranch, ctx);
    }

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
