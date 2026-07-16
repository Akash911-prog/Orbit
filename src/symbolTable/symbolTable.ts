import type { TokenType } from '../lexer/token';
import { OrbTypes, type OrbType } from '../types';
import { BUILTIN_FUNCTIONS_MAP } from './builtIn';

export type SymbolEntry =
    | VariableEntry
    | FunctionEntry
    | StructEntry
    | OrbitEntry
    | LoopEntry;

export type VariableEntry = {
    kind: 'variable';
    name: string;
    type: OrbType;
    mutable: boolean; // let vs var
    moved?: boolean;
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
    fields: VariableEntry[];
    methods: FunctionEntry[];
    moved?: boolean;
    copyable: boolean;
};

export type OrbitEntry = {
    kind: 'orbit';
    name: string;
};

export type LoopEntry = {
    kind: 'loop';
    name: string;
};

export class SymbolTable {
    private _table: Map<string, SymbolEntry>;
    private _parent: SymbolTable | null;
    private _child: SymbolTable | null;

    constructor(parent: SymbolTable | null = null) {
        this._table = new Map();
        this._parent = parent;
        this._child = null;
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
        if (this.table.has(name)) {
            this.table.set(name, entry);
            return true;
        }
        return false;
    }

    enterScope(): SymbolTable {
        const newScope = new SymbolTable(this);
        this._child = newScope;
        return newScope;
    }

    exitScope(): SymbolTable {
        if (this.parent) {
            return this.parent;
        }
        return this;
    }

    logMap(): void {
        console.log(JSON.stringify([...this.table], null, 2));
        if (this.child) this.child.logMap();
    }

    get child(): SymbolTable | null {
        return this._child;
    }

    get table(): Map<string, SymbolEntry> {
        return this._table;
    }

    get parent(): SymbolTable | null {
        return this._parent;
    }
}

export function initGlobalSymbolTable(): SymbolTable {
    const global = new SymbolTable();

    for (const [name, fnDefinition] of Object.entries(BUILTIN_FUNCTIONS_MAP)) {
        global.define(name, fnDefinition);
    }

    return global;
}
