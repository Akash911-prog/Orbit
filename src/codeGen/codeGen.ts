import { globalTable } from '../globals';
import type { Expression, Program } from '../parser/nodeTypes';
import {
    BuiltInMethodTemplate,
    IncludeStatements,
    OUTPUT_PATH,
    StringStruct,
} from './constants';
import type { ShapeCollector, ShapeInfo } from './shapeCollector';
import fs from 'node:fs';
import { typeGen } from './typeGen';
import type { CodeGenContext } from './context';
import { BuiltinMethods } from '../analyzer/registery';
import { CodeGenBuiltInMethods } from './builtInMethods';
import path from 'node:path';

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
        const dir = path.dirname(OUTPUT_PATH);
        fs.mkdirSync(dir, { recursive: true });
        this.stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
    }

    public generateCode() {
        this.runPrePass();
        this.stream.write(IncludeStatements);
        this.stream.write('\n\n');
        this.stream.write(StringStruct);
        typeGen(this.shapeInfoArray, this.ctx, this.ast);
        this.generateMethods();
        // this.generate(this.ast, this.ctx);

        this.stream.end();
        this.stream.on('finish', () => {});
    }

    private generate(node: any, ctx: CodeGenContext) {}

    private generateMethods() {
        const methods = [...this.collector.getAllMethods().values()];
        for (const method of methods) {
            const reviever = CodeGenBuiltInMethods[method.reciever.type.kind];
            if (!reviever) continue;
            const sig = reviever[method.method];
            if (!sig) continue;
            sig.emitRuntimeFn(
                method.reciever.key,
                method.reciever.type.kind,
                this.ctx
            );
        }
    }
}
