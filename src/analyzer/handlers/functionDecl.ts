import type { FunctionDecl } from '../../parser/nodeTypes';
import type { FunctionEntry } from '../../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleFunctionDecl(
    node: FunctionDecl,
    ctx: AnalyzerContext
): OrbType {
    const preDefined = ctx.globalScope.lookup(node.name);
    if (preDefined) {
        if (preDefined.kind === 'function' && preDefined.builtin) {
            ctx.reportError(`${node.name} is a builtin function`, node);
        } else {
            ctx.reportError(`${node.name} is already defined`, node);
        }
    }

    const entry: FunctionEntry = {
        kind: 'function',
        name: node.name,
        params: node.parameters.map((p) => ({
            name: p.name,
            type: ctx.typenodeToOrbType(p.paramType, ctx),
        })),
        returnType: node.returnType
            ? ctx.typenodeToOrbType(node.returnType, ctx)
            : OrbTypes.void(),
        builtin: false,
    };
    ctx.globalScope.define(node.name, entry);

    const previousFn = ctx.currentFunction;
    ctx.currentFunction = entry;
    ctx.visit(node.body, ctx);
    ctx.currentFunction = previousFn;
    return OrbTypes.void();
}
