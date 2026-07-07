import type { VariableDecl } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { isAssignable } from '../helper';
import { handleExpression } from './expression';

export function handleVariableDecl(
    node: VariableDecl,
    ctx: AnalyzerContext
): OrbType {
    if (!node.initializer) {
        if (!node.varType) {
            ctx.scope.define(node.name, {
                kind: 'variable',
                name: node.name,
                type: OrbTypes.unknown(),
                mutable: node.kind === 'var',
            });
            node.resolvedType = OrbTypes.unknown();
            return OrbTypes.unknown();
        }
        ctx.scope.define(node.name, {
            kind: 'variable',
            name: node.name,
            type: ctx.typenodeToOrbType(node.varType, ctx),
            mutable: node.kind === 'var',
        });
        node.resolvedType = ctx.typenodeToOrbType(node.varType, ctx);
        return ctx.typenodeToOrbType(node.varType, ctx);
    }

    if (node.varType && node.initializer) {
        const varType = handleExpression(node.initializer, ctx);
        if (!isAssignable(ctx.typenodeToOrbType(node.varType, ctx), varType)) {
            ctx.reportError(
                `Cannot assign type ${varType.kind} to type ${ctx.typenodeToOrbType(node.varType, ctx).kind}`,
                node
            );
        }
        ctx.scope.define(node.name, {
            kind: 'variable',
            name: node.name,
            type: varType,
            mutable: node.kind === 'var',
        });
        node.resolvedType = varType;
        return varType;
    }

    const varType = handleExpression(node.initializer, ctx);
    ctx.scope.define(node.name, {
        kind: 'variable',
        name: node.name,
        type: varType,
        mutable: node.kind === 'var',
    });
    node.resolvedType = varType;
    return varType;
}
