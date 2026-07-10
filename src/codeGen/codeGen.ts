import { globalTable } from '../globals';
import type { Program } from '../parser/nodeTypes';
import type { ShapeCollector, ShapeInfo } from './shapeCollector';

export class CodeGen {
    private collector: ShapeCollector;
    private ast: Program;
    private shapeInfoArray: ShapeInfo[] = [];

    constructor(shapeCollector: ShapeCollector, ast: Program) {
        this.collector = shapeCollector;
        this.ast = ast;
    }

    private runPrePass() {
        this.collector.collectFromSymbolTable(globalTable);
        this.shapeInfoArray = this.collector.topoSort();
        this.collector.collectMethods(this.ast);
    }

    public generateCode() {
        this.runPrePass();
    }
}
