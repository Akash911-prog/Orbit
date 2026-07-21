// functionDecl.ts
import type { FunctionDecl } from '../../parser/nodeTypes';
import type { FunctionEntry } from '../../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { processBlockBody } from './block'; // adjust path

export function handleFunctionDecl(
    node: FunctionDecl,
    ctx: AnalyzerContext
): OrbType {
    const preDefined = ctx.globalScope.lookup(node.name);
    if (preDefined) {
        if (preDefined.kind === 'function' && preDefined.builtin) {
            ctx.reportError(`${node.name} is a builtin function`, node);
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

    const parentScope = ctx.scope;
    ctx.scope = ctx.scope.enterScope();

    // define params in the function's own scope, not the block's nested one
    for (const param of entry.params) {
        ctx.scope.define(param.name, {
            kind: 'variable',
            name: param.name,
            type: param.type,
            moved: false,
            mutable: false,
        });
    }

    processBlockBody(node.body, ctx);

    ctx.scope = parentScope;
    ctx.currentFunction = previousFn;

    return OrbTypes.void();
}
