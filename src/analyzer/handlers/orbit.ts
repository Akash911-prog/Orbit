import type { OrbitBlock, RootOrbitDecl } from '../../parser/nodeTypes';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleOrbit(
    node: OrbitBlock | RootOrbitDecl,
    ctx: AnalyzerContext
): OrbType {
    switch (node.type) {
        case 'OrbitBlock': {
            ctx.scope.define(node.name, { kind: 'orbit', name: node.name });
            ctx.visit(node.body, ctx);
            return OrbTypes.void();
        }
        case 'RootOrbitDecl': {
            ctx.globalScope.define('main', { kind: 'orbit', name: 'main' });
            ctx.visit(node.body, ctx);
            return OrbTypes.void();
        }
    }
}
