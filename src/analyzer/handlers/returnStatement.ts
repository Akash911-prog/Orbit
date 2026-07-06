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
    return OrbTypes.void();
}
