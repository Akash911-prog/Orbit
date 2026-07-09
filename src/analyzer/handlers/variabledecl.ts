import type { VariableDecl } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { isAssignable } from '../helper';
import { handleExpression } from './expression';

function defineVariable(
    node: VariableDecl,
    ctx: AnalyzerContext,
    type: OrbType
): void {
    const defined = ctx.scope.define(node.name, {
        kind: 'variable',
        name: node.name,
        type,
        mutable: node.kind === 'var',
    });
    if (!defined) {
        ctx.reportError(
            `'${node.name}' is already defined in this scope`,
            node
        );
    }
    node.resolvedType = type;
}

export function handleVariableDecl(
    node: VariableDecl,
    ctx: AnalyzerContext
): OrbType {
    // Case 1: no initializer — type must come from the annotation, or is unknown
    if (!node.initializer) {
        const declaredType = node.varType
            ? ctx.typenodeToOrbType(node.varType, ctx)
            : OrbTypes.unknown();

        if (!node.varType) {
            ctx.reportError(
                `'${node.name}' needs a type annotation or an initializer`,
                node
            );
        }

        defineVariable(node, ctx, declaredType);
        return declaredType;
    }

    // Case 2: has an initializer — always visit it to get its inferred type
    const initType = handleExpression(node.initializer, ctx);

    // No explicit annotation — infer entirely from the initializer
    if (!node.varType) {
        defineVariable(node, ctx, initType);
        return initType;
    }

    // Both present — declared type wins as the stored type; initializer is checked against it
    const declaredType = ctx.typenodeToOrbType(node.varType, ctx);

    // Empty collection literal special case: `let a: int[] = []` —
    // the literal alone can't tell you its element type, so trust the annotation
    const isEmptyCollectionLiteral =
        (declaredType.kind === 'array' ||
            declaredType.kind === 'tuple' ||
            declaredType.kind === 'map') &&
        initType.kind === declaredType.kind &&
        ('element' in initType ? initType.element.kind === 'unknown' : false);

    if (isEmptyCollectionLiteral) {
        defineVariable(node, ctx, declaredType);
        return declaredType;
    }

    if (!isAssignable(initType, declaredType)) {
        ctx.reportError(
            `Cannot assign type ${initType.kind} to '${node.name}' of type ${declaredType.kind}`,
            node
        );
    }

    defineVariable(node, ctx, declaredType);
    return declaredType;
}
