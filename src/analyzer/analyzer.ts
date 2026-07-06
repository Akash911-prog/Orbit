import type { OrbitError } from '../errors/errorList';
import { ErrorType } from '../errors/errorTypes';
import { globalErrorBucket, globalTable } from '../globals';
import type { Program, TypeNode, VariableDecl } from '../parser/nodeTypes';
import type {
    FunctionEntry,
    StructEntry,
    VariableEntry,
} from '../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../types';
import type { AnalyzerContext } from './context';
import { handleExpression } from './handlers/expression';

export class SemanticAnalyzer {
    private ast: Program;
    private ctx: AnalyzerContext;

    constructor(ast: Program) {
        this.ast = ast;
        this.ctx = {
            scope: globalTable,
            globalScope: globalTable,
            currentFunction: null,
            reportError: (msg: string, node: any) =>
                this.reportError(msg, node),
            visit: (node: any, ctx: AnalyzerContext) => this.visit(node, ctx),
        };
    }

    public analyze(): Program {
        this.hoistSignatures(this.ast, this.ctx);

        for (const node of this.ast.declarations) {
            if (node.type === 'VariableDecl') {
                this.analyzeVariableDecl(node, this.ctx); // fills in real type, was 'unknown' from hoisting
            }
        }

        // this.ctx.visit(this.ast, this.ctx);

        return this.ast;
    }

    private reportError(msg: string, node: any): void {
        const error: OrbitError = {
            type: ErrorType.ReferenceError,
            message: msg,
            line: node.line,
            col: node.col,
        };

        globalErrorBucket.add(error);
    }

    private visit(node: any, ctx: AnalyzerContext): OrbType {
        throw new Error('Method not implemented.');
    }

    private analyzeVariableDecl(
        node: VariableDecl,
        ctx: AnalyzerContext
    ): OrbType {
        const varType = handleExpression(node.initializer, ctx);

        const entry: VariableEntry = {
            kind: 'variable',
            name: node.name,
            type: varType,
            mutable: node.kind === 'var',
        };

        ctx.globalScope.update(node.name, entry);
        return varType;
    }

    private hoistSignatures(ast: Program, ctx: AnalyzerContext): void {
        for (const node of ast.declarations) {
            switch (node.type) {
                case 'RootOrbitDecl':
                    break;

                case 'FunctionDecl': {
                    const preDefined = ctx.globalScope.lookup(node.name);
                    if (preDefined) {
                        if (
                            preDefined.kind === 'function' &&
                            preDefined.builtin
                        ) {
                            ctx.reportError(
                                `${node.name} is a builtin function`,
                                node
                            );
                        } else {
                            ctx.reportError(
                                `${node.name} is already defined`,
                                node
                            );
                        }
                        continue; // skip redefining, but keep hoisting the rest
                    }

                    const entry: FunctionEntry = {
                        kind: 'function',
                        name: node.name,
                        params: node.parameters.map((p) => ({
                            name: p.name,
                            type: this.TypeNodeToOrbType(p.paramType, ctx),
                        })),
                        returnType: node.returnType
                            ? this.TypeNodeToOrbType(node.returnType, ctx)
                            : OrbTypes.void(),
                        builtin: false,
                    };
                    ctx.globalScope.define(node.name, entry);
                    break;
                }

                case 'VariableDecl':
                    const varType = node.varType
                        ? this.TypeNodeToOrbType(node.varType, ctx)
                        : OrbTypes.unknown();

                    const entry: VariableEntry = {
                        kind: 'variable',
                        name: node.name,
                        type: varType,
                        mutable: node.kind === 'var',
                    };

                    let success = ctx.globalScope.define(node.name, entry);
                    if (!success) {
                        ctx.reportError(
                            `${node.name} is already defined`,
                            node
                        );
                    }
                    break;

                //TODO: add case for Nova declaration

                case 'StructDecl':
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
                                        type: this.TypeNodeToOrbType(
                                            p.paramType,
                                            ctx
                                        ),
                                    })),
                                    returnType: member.returnType
                                        ? this.TypeNodeToOrbType(
                                              member.returnType,
                                              ctx
                                          )
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
                                        ? this.TypeNodeToOrbType(
                                              member.varType,
                                              ctx
                                          )
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

                    let notdefined = ctx.globalScope.define(
                        node.name,
                        structEntry
                    );
                    if (!notdefined) {
                        ctx.reportError(
                            `${node.name} is already defined`,
                            node
                        );
                    }
                    break;
                default:
                    break;
            }
        }
    }

    private TypeNodeToOrbType(node: TypeNode, ctx: AnalyzerContext): OrbType {
        switch (node.type) {
            case 'BaseType': {
                switch (node.name) {
                    case 'int':
                        return OrbTypes.int();
                    case 'float':
                        return OrbTypes.float();
                    case 'bool':
                        return OrbTypes.bool();
                    case 'str':
                        return OrbTypes.str();
                    case 'String':
                        return { kind: 'String' };
                    case 'char':
                        return OrbTypes.char();
                    case 'byte':
                        return OrbTypes.byte();
                    case 'void':
                        return OrbTypes.void();
                    case 'null':
                        return OrbTypes.null();
                    default: {
                        // Not a primitive — assume it's a struct reference
                        const entry = ctx.globalScope.lookup(node.name);
                        if (!entry || entry.kind !== 'struct') {
                            ctx.reportError(
                                `Unknown type '${node.name}'`,
                                node
                            );
                            return OrbTypes.unknown();
                        }
                        return OrbTypes.struct(node.name);
                    }
                }
            }

            case 'NullableType':
                // No nullable wrapper in OrbType yet — flagging, see note below
                return OrbTypes.nullable(
                    this.TypeNodeToOrbType(node.inner, ctx)
                );

            case 'ArrayType':
                return OrbTypes.array(
                    this.TypeNodeToOrbType(node.element, ctx)
                );

            case 'MapType':
                return OrbTypes.map(
                    this.TypeNodeToOrbType(node.key, ctx),
                    this.TypeNodeToOrbType(node.value, ctx)
                );

            case 'TupleType':
                return OrbTypes.tuple(
                    node.elements.map((e) => this.TypeNodeToOrbType(e, ctx))
                );

            case 'ResultType':
                // TODO: Need to revisit. Result types are not yet supported
                ctx.reportError('Result types are not yet supported', node);
                return OrbTypes.unknown();

            case 'GenericType':
                const entry = ctx.globalScope.lookup(node.name);
                if (!entry || entry.kind !== 'struct') {
                    return OrbTypes.generic(node.name);
                }
                return OrbTypes.struct(node.name);

            default:
                ctx.reportError(`Unhandled type node`, node);
                return OrbTypes.unknown();
        }
    }
}
