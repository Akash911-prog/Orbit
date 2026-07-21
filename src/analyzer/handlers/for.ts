import type { ForStatement } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { processBlockBody } from './block';

export function handleForStatement(
    node: ForStatement,
    ctx: AnalyzerContext
): OrbType {
    const expressionType = ctx.visit(node.iterable, ctx);
    if (!expressionType.iterable) {
        ctx.reportError(
            `${expressionType.kind} Does not have an iterator`,
            node
        );
        return OrbTypes.unknown();
    }

    const varType = (expressionType: OrbType): OrbType => {
        switch (expressionType.kind) {
            case 'array':
                return expressionType.element;
            case 'map':
                return expressionType.key;
            case 'tuple':
                return expressionType.elements[0]!;
            default:
                return OrbTypes.unknown();
        }
    };

    const parent = ctx.scope;
    ctx.scope = ctx.scope.enterScope();

    ctx.scope.define(node.variable, {
        kind: 'variable',
        name: node.variable,
        type: expressionType.iterable
            ? varType(expressionType)
            : OrbTypes.unknown(),
        mutable: true,
    });
    processBlockBody(node.body, ctx);
    ctx.scope.update(node.variable, {
        kind: 'variable',
        name: node.variable,
        type: expressionType.iterable
            ? varType(expressionType)
            : OrbTypes.unknown(),
        mutable: true,
        moved: true,
    });

    ctx.scope = parent;

    return OrbTypes.void();
}
