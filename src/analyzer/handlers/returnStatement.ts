import type { ReturnStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { expectType } from '../helper';

export function handleReturnStatement(
    node: ReturnStatement,
    ctx: AnalyzerContext
): OrbType {
    if (!ctx.currentFunction) {
        ctx.reportError('Return statement outside of function', node);
        return OrbTypes.void();
    }

    const actualType = node.value
        ? ctx.visit(node.value, ctx)
        : OrbTypes.void();

    expectType(
        ctx.currentFunction.returnType,
        actualType,
        node,
        ctx,
        `Return type mismatch, Expected ${ctx.currentFunction.returnType.kind}, got ${actualType.kind}`
    );

    if (node.value?.type === 'Identifier') {
        const entry = ctx.scope.lookup(node.value.name);

        if (
            entry?.kind === 'variable' &&
            !entry.moved &&
            !entry.type.copyable
        ) {
            // ownership leaves via return — mark moved in ITS OWN scope only.
            // no parent-scope registration: the caller establishes its own
            // binding independently wherever it consumes the call result.
            ctx.scope.update(node.value.name, { ...entry, moved: true });
        }
    }

    return OrbTypes.void();
}
