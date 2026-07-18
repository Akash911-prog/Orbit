import type { Assignment } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { isAssignable } from '../helper';

export function handleAssignment(
    node: Assignment,
    ctx: AnalyzerContext
): OrbType {
    const [rootName, ...path] = node.target;
    const entry = ctx.scope.lookup(rootName!);
    if (!entry || entry.kind !== 'variable') {
        ctx.reportError(`Undefined variable '${rootName}'`, node);
        return OrbTypes.unknown();
    }

    if (!entry.mutable && path.length === 0) {
        ctx.reportError(
            `Cannot assign to immutable variable '${rootName}'`,
            node
        );
        return OrbTypes.unknown();
    }

    let targetType = entry.type;
    let pathLength = 0;
    for (const field in path) {
        pathLength++;
        if (targetType.kind !== 'struct') {
            ctx.reportError(
                `Cannot access field '${field}' of non-struct type '${rootName}'`,
                node
            );
            return OrbTypes.unknown();
        }
        const structEntry = ctx.scope.lookup(targetType.name);
        if (!structEntry || structEntry.kind !== 'struct') {
            ctx.reportError(`Undefined struct '${targetType.name}'`, node);
            return OrbTypes.unknown();
        }
        const field_ = structEntry.fields.find((f) => f.name === field);
        if (!field_) {
            ctx.reportError(
                `Struct '${targetType.name}' has no field '${field}'`,
                node
            );
            return OrbTypes.unknown();
        }
        if (!field_.mutable && pathLength === path.length) {
            ctx.reportError(
                `Cannot assign to immutable field '${field}' of struct '${targetType.name}'`,
                node
            );
            return OrbTypes.unknown();
        }
        targetType = field_.type;
    }

    const valueType = ctx.visit(node.value, ctx);
    if (!isAssignable(valueType, targetType)) {
        ctx.reportError(
            `Cannot assign ${valueType.kind} to '${node.target.join('.')}' of type ${targetType.kind}`,
            node
        );
        return OrbTypes.unknown();
    }
    if (node.value.type === 'Identifier' && !valueType.copyable) {
        ctx.scope.update(node.value.name, { ...entry, moved: true });
    }
    return OrbTypes.void();
}
