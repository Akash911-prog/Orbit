import type { TypeNode } from '../parser/nodeTypes';
import type { FunctionEntry, SymbolTable } from '../symbolTable/symbolTable';
import type { OrbType } from '../types';

export interface AnalyzerContext {
    scope: SymbolTable;
    globalScope: SymbolTable;
    currentFunction: FunctionEntry | null;
    loopDepth: number;
    typenodeToOrbType: (node: TypeNode, ctx: AnalyzerContext) => OrbType;
    reportError: (msg: string, node: any) => void;
    visit: (node: any, ctx: AnalyzerContext) => OrbType;
}
