import type { SymbolTable } from '../symbolTable/symbolTable';
import fs from 'fs';

export interface CodeGenContext {
    globalScope: SymbolTable;
    stream: fs.WriteStream;
    generate: (node: any, ctx: CodeGenContext) => void;
}
