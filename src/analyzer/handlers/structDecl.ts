import type { StructDecl } from '../../parser/nodeTypes';
import type {
    FunctionEntry,
    StructEntry,
    VariableEntry,
} from '../../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../../types';
import type { AnalyzerContext } from '../context';

export function handleStructDecl(
    node: StructDecl,
    ctx: AnalyzerContext
): OrbType {
    const alreadyDefined = ctx.globalScope.lookup(node.name);
    if (alreadyDefined) {
        return OrbTypes.void();
    }

    const methods: FunctionEntry[] = [];
    const fields: VariableEntry[] = [];

    for (const member of node.members) {
        switch (member.type) {
            case 'FunctionDecl':
                const funcEntry: FunctionEntry = {
                    kind: 'function',
                    name: member.name,
                    params: member.parameters.map((p) => ({
                        name: p.name,
                        type: ctx.typenodeToOrbType(p.paramType, ctx),
                    })),
                    returnType: member.returnType
                        ? ctx.typenodeToOrbType(member.returnType, ctx)
                        : OrbTypes.void(),
                    builtin: false,
                };

                methods.push(funcEntry);
                break;

            case 'VariableDecl':
                const fieldEntry: VariableEntry = {
                    kind: 'variable',
                    name: member.name,
                    type: member.varType
                        ? ctx.typenodeToOrbType(member.varType, ctx)
                        : OrbTypes.unknown(),
                    mutable: member.kind === 'var',
                };

                fields.push(fieldEntry);
                break;
        }
    }

    const structEntry: StructEntry = {
        kind: 'struct',
        name: node.name,
        fields: fields,
        methods: methods,
    };

    let notdefined = ctx.globalScope.define(node.name, structEntry);
    if (!notdefined) {
        ctx.reportError(`${node.name} is already defined`, node);
    }

    return OrbTypes.void();
}
