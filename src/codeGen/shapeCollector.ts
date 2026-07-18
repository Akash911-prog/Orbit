import { globalTable } from '../globals';
import type { Program } from '../parser/nodeTypes';
import type { SymbolEntry, SymbolTable } from '../symbolTable/symbolTable';
import { OrbTypes, type OrbType } from '../types';
import { directlyDependsOn, getShapeKey, isCompositeOrString } from './helper';

export interface ShapeInfo {
    key: string;
    type: OrbType;
    dependsOn: string[];
}

export interface MethodInfo {
    key: string;
    reciever: ShapeInfo;
    method: string;
}

export class ShapeCollector {
    private shapes: Map<string, ShapeInfo> = new Map();
    private methods: Map<string, MethodInfo> = new Map();

    public collect(t: OrbType, table: SymbolTable): void {
        if (!isCompositeOrString(t)) return; // stop if not a composite type

        const key = getShapeKey(t);
        if (this.shapes.has(key)) return;

        const deps = directlyDependsOn(t);

        // define a placeholder to stop any cyclic behaviour
        this.shapes.set(key, { key, type: t, dependsOn: [] });

        const dependsOn: string[] = [];

        // Collect dependencies
        for (const dep of deps) {
            if (!isCompositeOrString(dep)) continue;
            const depKey = getShapeKey(dep);
            dependsOn.push(depKey);
            if (!this.shapes.has(depKey) && isCompositeOrString(dep))
                this.collect(dep, table);
        }

        // case or structs. dependency custom defined
        if (t.kind === 'struct') {
            const struct = table.lookup(t.name)!;
            if (!struct || struct.kind !== 'struct') return;
            for (const field of struct.fields) {
                if (!isCompositeOrString(field.type)) continue;
                const fieldKey = getShapeKey(field.type);
                if (
                    !this.shapes.has(fieldKey) &&
                    isCompositeOrString(field.type)
                )
                    this.collect(field.type, table);
                dependsOn.push(fieldKey);
            }
        }

        this.shapes.set(key, { key, type: t, dependsOn });
    }

    public collectMethods(root: any) {
        this.walk(root);
    }

    private walk(node: any) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            for (const item of node) {
                this.walk(item);
            }
            return;
        }
        if (node.type === 'MethodCall') {
            if (node.builtInReciever) {
                const shapeKey = getShapeKey(node.builtInReciever);
                if (!this.shapes.has(shapeKey)) {
                    this.collect(node.builtInReciever, globalTable);
                }
                const key = `${shapeKey}_${node.method}`;
                if (node.builtInReciever.kind === 'array') {
                    const key = `${shapeKey}_grow`;
                    this.methods.set(key, {
                        key,
                        reciever: this.shapes.get(shapeKey)!,
                        method: 'grow',
                    });
                }
                if (!this.methods.has(key)) {
                    this.methods.set(key, {
                        key,
                        reciever: this.shapes.get(shapeKey)!,
                        method: node.method,
                    });
                }
            }
        } else if (node.type === 'RangeExpr') {
            this.collect(OrbTypes.array(OrbTypes.int()), globalTable);
        }

        for (const key of Object.keys(node)) {
            if (key === 'type') continue;
            this.walk(node[key]);
        }
    }

    public topoSort(): ShapeInfo[] {
        const sorted: ShapeInfo[] = [];
        const inDegree = new Map<string, number>();
        const adjacencyList = new Map<string, string[]>();

        // Step 1: Initialize structures without mutating the original shapes
        for (const shape of this.shapes.values()) {
            inDegree.set(shape.key, shape.dependsOn.length);

            for (const depKey of shape.dependsOn) {
                if (!adjacencyList.has(depKey)) {
                    adjacencyList.set(depKey, []);
                }
                adjacencyList.get(depKey)!.push(shape.key);
            }
        }

        // Step 2: Queue nodes with 0 incoming dependencies
        const queue: ShapeInfo[] = [];
        for (const shape of this.shapes.values()) {
            if (inDegree.get(shape.key) === 0) {
                queue.push(shape);
            }
        }

        // Step 3: Process the queue
        while (queue.length > 0) {
            const shape = queue.shift()!;
            sorted.push(shape);

            const dependents = adjacencyList.get(shape.key) || [];
            for (const dependentKey of dependents) {
                const currentInDegree = inDegree.get(dependentKey)! - 1;
                inDegree.set(dependentKey, currentInDegree);

                if (currentInDegree === 0) {
                    const dependentShape = this.shapes.get(dependentKey);
                    if (dependentShape) queue.push(dependentShape);
                }
            }
        }
        // Optional: Cycle check
        if (sorted.length !== this.shapes.size) {
            throw new Error(
                'Cyclic dependency detected! Topological sort impossible.'
            );
        }

        return sorted;
    }

    public collectFromSymbolTable(table: SymbolTable | null): void {
        let currentTable: SymbolTable | null = table;

        while (currentTable !== null) {
            // 1. Walk through all entries in the current scope level
            // We use a private helper to extract and process relevant entries
            this.collectFromTableEntries(currentTable);

            // 2. Move down to the next nested scope level (Top-Down)
            currentTable = currentTable.child;
        }
    }

    /**
     * Interrogates the SymbolEntry variants to pull out nested OrbTypes
     */
    private collectFromTableEntries(table: SymbolTable): void {
        // We use a trick to access the private 'table' map safely if we are in the same module,
        // or add a getter/method on SymbolTable to expose values/entries.
        // Assuming this is accessible or you add a public getter for entries:
        const entries = (table as any).table as Map<string, SymbolEntry>;
        if (!entries) return;

        for (const entry of entries.values()) {
            switch (entry.kind) {
                case 'variable':
                    this.collect(entry.type, table);
                    break;

                case 'function':
                    // Collect parameter types
                    for (const param of entry.params) {
                        this.collect(param.type, table);
                    }
                    // Collect return type
                    this.collect(entry.returnType, table);
                    break;

                case 'struct':
                    // Map the top-level struct type itself
                    this.collect(
                        {
                            kind: 'struct',
                            name: entry.name,
                            copyable: entry.copyable,
                        },
                        table
                    );

                    // Collect field types
                    for (const field of entry.fields) {
                        this.collect(field.type, table);
                    }
                    // Collect struct method signatures
                    for (const method of entry.methods) {
                        for (const param of method.params) {
                            this.collect(param.type, table);
                        }
                        this.collect(method.returnType, table);
                    }
                    break;

                case 'orbit':
                case 'loop':
                    // These do not possess explicit OrbType shapes to collect
                    break;
            }
        }
    }

    getAllShapes(): Map<string, ShapeInfo> {
        return this.shapes;
    }

    getAllMethods(): Map<string, MethodInfo> {
        return this.methods;
    }
}
