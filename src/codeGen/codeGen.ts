import { globalTable } from '../globals';
import type { Expression, Program } from '../parser/nodeTypes';
import { OUTPUT_PATH } from './constants';
import type { ShapeCollector, ShapeInfo } from './shapeCollector';
import fs from 'node:fs';
import { typeGen } from './typeGen';
import type { CodeGenContext } from './context';

export class CodeGen {
    private collector: ShapeCollector;
    private ast: Program;
    private shapeInfoArray: ShapeInfo[] = [];
    private stream!: fs.WriteStream;
    private ctx: CodeGenContext;

    constructor(shapeCollector: ShapeCollector, ast: Program) {
        this.collector = shapeCollector;
        this.ast = ast;
        this.startStream();
        this.ctx = {
            stream: this.stream,
            globalScope: globalTable,
            generate: (node: any, ctx: CodeGenContext) =>
                this.generate(node, ctx),
        };
    }

    private runPrePass() {
        this.collector.collectFromSymbolTable(globalTable);
        this.shapeInfoArray = this.collector.topoSort();
        this.collector.collectMethods(this.ast);
    }

    private startStream() {
        fs.mkdirSync(OUTPUT_PATH, { recursive: true });
        this.stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
    }

    public generateCode() {
        this.runPrePass();
        typeGen(this.shapeInfoArray, this.ctx, this.ast);
        this.generate(this.ast, this.ctx);
    }

    private generate(node: any, ctx: CodeGenContext) {}
}
