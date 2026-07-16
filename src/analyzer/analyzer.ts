import type { OrbitError } from '../errors/errorList';
import { ErrorType } from '../errors/errorTypes';
import { globalErrorBucket, globalTable } from '../globals';
import type {
    Program,
    StructDecl,
    TypeNode,
    VariableDecl,
} from '../parser/nodeTypes';
import type {
    FunctionEntry,
    StructEntry,
    VariableEntry,
} from '../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../types';
import type { AnalyzerContext } from './context';
import { handleExpression } from './handlers/expression';
import { isAssignable, resolveVariableType } from './helper';
import { HandlerRegistry } from './registery';

export class SemanticAnalyzer {
    private ast: Program;
    private ctx: AnalyzerContext;

    constructor(ast: Program) {
        this.ast = ast;
        this.ctx = {
            scope: globalTable,
            globalScope: globalTable,
            currentFunction: null,
            loopDepth: 0,
            typenodeToOrbType: (node: TypeNode, ctx: AnalyzerContext) =>
                this.typeNodeToOrbType(node, ctx),
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

        for (const node of this.ast.declarations) {
            if (node.type === 'StructDecl') {
                this.resolveCopyability(node, this.ctx);
            }
        }

        this.ctx.visit(this.ast, this.ctx);

        return this.ast;
    }

    private resolveCopyability(node: StructDecl, ctx: AnalyzerContext) {
        const entry = ctx.globalScope.lookup(node.name);
        if (entry && entry.kind === 'struct') {
            const isCopable = entry.fields.every(
                (member) => member.type.copyable
            );
            entry.copyable = isCopable;
        }
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
        const handler = HandlerRegistry[node.type];
        if (!handler) {
            ctx.reportError(`Unknown node type: ${node.type}`, node);
            return OrbTypes.unknown();
        }

        return handler(node, ctx);
    }

    private analyzeVariableDecl(
        node: VariableDecl,
        ctx: AnalyzerContext
    ): OrbType {
        const type = resolveVariableType(node, ctx);
        ctx.globalScope.update(node.name, {
            kind: 'variable',
            name: node.name,
            type,
            mutable: node.kind === 'var',
        });
        node.resolvedType = type;
        return type;
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
                            type: this.typeNodeToOrbType(p.paramType, ctx),
                        })),
                        returnType: node.returnType
                            ? this.typeNodeToOrbType(node.returnType, ctx)
                            : OrbTypes.void(),
                        builtin: false,
                    };
                    ctx.globalScope.define(node.name, entry);
                    break;
                }

                case 'VariableDecl':
                    const varType = node.varType
                        ? this.typeNodeToOrbType(node.varType, ctx)
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

                case 'StructDecl': {
                    const methods: FunctionEntry[] = [];
                    const fields: VariableEntry[] = [];

                    // ctx.globalScope.define(node.name, {
                    //     kind: 'struct',
                    //     name: node.name,
                    //     methods,
                    //     fields,
                    // });

                    for (const member of node.members) {
                        switch (member.type) {
                            case 'FunctionDecl': {
                                const funcEntry: FunctionEntry = {
                                    kind: 'function',
                                    name: member.name,
                                    params: member.parameters.map((p) => ({
                                        name: p.name,
                                        type: this.typeNodeToOrbType(
                                            p.paramType,
                                            ctx
                                        ),
                                    })),
                                    returnType: member.returnType
                                        ? this.typeNodeToOrbType(
                                              member.returnType,
                                              ctx
                                          )
                                        : OrbTypes.void(),
                                    builtin: false,
                                };
                                methods.push(funcEntry);
                                break;
                            }

                            case 'VariableDecl': {
                                const fieldType = resolveVariableType(
                                    member,
                                    ctx,
                                    true
                                );
                                member.resolvedType = fieldType;
                                fields.push({
                                    kind: 'variable',
                                    name: member.name,
                                    type: fieldType,
                                    mutable: member.kind === 'var',
                                });
                                break;
                            }
                        }
                    }

                    for (const field of fields) {
                        if (field.type.kind !== 'struct') continue;

                        if (field.type.name === node.name) {
                            ctx.reportError(
                                `Struct '${node.name}' cannot contain itself by value (field '${field.name}')`,
                                node
                            );
                            continue;
                        }

                        const referenced = ctx.globalScope.lookup(
                            field.type.name
                        );
                        if (!referenced || referenced.kind !== 'struct') {
                            ctx.reportError(
                                `Undefined struct '${field.type.name}'`,
                                node
                            );
                            continue;
                        }

                        const isMutualCycle = referenced.fields.some(
                            (f) =>
                                f.type.kind === 'struct' &&
                                f.type.name === node.name
                        );
                        if (isMutualCycle) {
                            ctx.reportError(
                                `Cycle detected: '${node.name}' and '${field.type.name}' embed each other by value`,
                                node
                            );
                        }
                    }

                    const structEntry: StructEntry = {
                        kind: 'struct',
                        name: node.name,
                        fields,
                        methods,
                        copyable: true,
                    };

                    const defined = ctx.globalScope.define(
                        node.name,
                        structEntry
                    );
                    if (!defined) {
                        ctx.reportError(
                            `${node.name} is already defined`,
                            node
                        );
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    private typeNodeToOrbType(node: TypeNode, ctx: AnalyzerContext): OrbType {
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
                        return OrbTypes.String();
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
                        return OrbTypes.struct(node.name, entry.copyable);
                    }
                }
            }

            case 'NullableType':
                // No nullable wrapper in OrbType yet — flagging, see note below
                return OrbTypes.nullable(
                    this.typeNodeToOrbType(node.inner, ctx)
                );

            case 'ArrayType':
                return OrbTypes.array(
                    this.typeNodeToOrbType(node.element, ctx)
                );

            case 'MapType':
                return OrbTypes.map(
                    this.typeNodeToOrbType(node.key, ctx),
                    this.typeNodeToOrbType(node.value, ctx)
                );

            case 'TupleType':
                return OrbTypes.tuple(
                    node.elements.map((e) => this.typeNodeToOrbType(e, ctx))
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
                return OrbTypes.struct(node.name, entry.copyable);

            default:
                ctx.reportError(`Unhandled type node`, node);
                return OrbTypes.unknown();
        }
    }
}
