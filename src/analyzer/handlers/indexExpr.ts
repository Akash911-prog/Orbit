import type { IndexExpr } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';
import { expectType } from '../helper';

export function handleIndexExpr(
    node: IndexExpr,
    ctx: AnalyzerContext
): OrbType {
    const objType = ctx.visit(node.object, ctx);
    if (
        objType.kind === 'array' ||
        objType.kind === 'String' ||
        objType.kind === 'tuple' ||
        objType.kind === 'str'
    ) {
        const indexType = ctx.visit(node.index, ctx);
        expectType(OrbTypes.int(), indexType, node, ctx);
        switch (objType.kind) {
            case 'array': {
                return objType.element;
            }
            case 'String': {
                return OrbTypes.char();
            }
            case 'tuple': {
                // 1. Check if the index node is an integer literal
                if (
                    node.index.type === 'IntLiteral' &&
                    typeof node.index.value === 'string'
                ) {
                    const idx = parseInt(node.index.value);

                    if (Number.isNaN(idx)) {
                        ctx.reportError(
                            `Tuple indices must be non-negative`,
                            node.index
                        );
                        return OrbTypes.unknown();
                    }

                    // 2. Bounds check
                    if (idx >= 0 && idx < objType.elements.length) {
                        return objType.elements[idx]!;
                    }

                    ctx.reportError(
                        `Index ${idx} is out of bounds for tuple of length ${objType.elements.length}`,
                        node.index
                    );
                    return OrbTypes.unknown(); // or your fallback error type
                }

                // 3. Fallback if the index is a dynamic variable/expression
                ctx.reportError(
                    `Tuple indices must be compile-time constant integer literals`,
                    node.index
                );
                return OrbTypes.unknown();
            }
            case 'str': {
                return OrbTypes.char();
            }
        }
    }
    ctx.reportError(`Expected array type`, node);
    return OrbTypes.unknown();
}
