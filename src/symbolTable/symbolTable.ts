import type { TokenType } from '../lexer/token';
import { OrbTypes, type OrbType } from '../types';
import { BUILTIN_FUNCTIONS_MAP } from './builtIn';

export type SymbolEntry = VariableEntry | FunctionEntry | StructEntry;

export type VariableEntry = {
    kind: 'variable';
    name: string;
    type: OrbType;
    mutable: boolean; // let vs var
};

export type FunctionEntry = {
    kind: 'function';
    name: string;
    params: { name: string; type: OrbType }[];
    returnType: OrbType;
    builtin: boolean; // true for print, println etc
};

export type StructEntry = {
    kind: 'struct';
    name: string;
    fields: { name: string | null; type: OrbType; mutable: boolean }[];
    methods: FunctionEntry[];
};

export class SymbolTable {
    private table: Map<string, SymbolEntry>;
    private parent: SymbolTable | null;

    constructor(parent: SymbolTable | null = null) {
        this.table = new Map();
        this.parent = parent;
    }

    define(name: string, entry: SymbolEntry): boolean {
        if (this.table.has(name)) {
            return false;
        }
        this.table.set(name, entry);
        return true;
    }

    lookup(name: string): SymbolEntry | null {
        if (this.table.has(name)) return this.table.get(name)!;
        if (this.parent) return this.parent.lookup(name);
        return null;
    }

    lookupLocal(name: string): SymbolEntry | null {
        if (this.table.has(name)) return this.table.get(name)!;
        return null;
    }

    update(name: string, entry: SymbolEntry): boolean {
        const isRemoved = this.table.delete(name);
        if (isRemoved) {
            this.table.set(name, entry);
            return true;
        }
        return false;
    }

    enterScope(): SymbolTable {
        return new SymbolTable(this);
    }

    exitScope(): SymbolTable {
        return this.parent!;
    }

    logMap(): void {
        console.log(JSON.stringify([...this.table], null, 2));
    }
}

export function initGlobalSymbolTable(): SymbolTable {
    const global = new SymbolTable();

    for (const [name, fnDefinition] of Object.entries(BUILTIN_FUNCTIONS_MAP)) {
        global.define(name, fnDefinition);
    }

    return global;
}
