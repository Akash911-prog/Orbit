import type { TokenType } from '../lexer/token';
import { OrbTypes, type OrbType } from '../types';
import { BUILTIN_FUNCTIONS_MAP } from './builtIn';

export type SymbolEntry = VariableEntry | FunctionEntry | StructEntry;

type VariableEntry = {
    kind: 'variable';
    name: string;
    type: OrbType;
    mutable: boolean; // let vs var
};

type FunctionEntry = {
    kind: 'function';
    name: string;
    params: { name: string; type: OrbType }[];
    returnType: OrbType;
    builtin: boolean; // true for print, println etc
};

type StructEntry = {
    kind: 'struct';
    name: string;
    fields: { name: string; type: OrbType; mutable: boolean }[];
    methods: FunctionEntry[];
};

class SymbolTable {
    private table: Map<string, SymbolEntry>;
    private parent: SymbolTable | null;

    constructor(parent: SymbolTable | null = null) {
        this.table = new Map();
        this.parent = parent;
    }

    define(name: string, entry: SymbolEntry): void {
        this.table.set(name, entry);
    }

    lookup(name: string): SymbolEntry | null {
        if (this.table.has(name)) return this.table.get(name)!;
        if (this.parent) return this.parent.lookup(name);
        return null;
    }

    enterScope(): SymbolTable {
        return new SymbolTable(this);
    }

    exitScope(): SymbolTable {
        return this.parent!;
    }
}

export function initGlobalSymbolTable(): SymbolTable {
    const global = new SymbolTable();

    for (const [name, fnDefinition] of Object.entries(BUILTIN_FUNCTIONS_MAP)) {
        global.define(name, fnDefinition);
    }

    return global;
}
