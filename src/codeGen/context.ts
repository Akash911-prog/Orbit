import type { SymbolTable } from '../symbolTable/symbolTable';
import fs from 'fs';
import type { ShapeInfo } from './shapeCollector';

export interface CodeGenContext {
    globalScope: SymbolTable;
    stream: fs.WriteStream;
    shapeInfo: Map<string, ShapeInfo>;
    scope: SymbolTable;
    tempCounter: number;
    generate: (node: any, ctx: CodeGenContext) => void;
}
