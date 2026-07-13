import { globalTable } from '../globals';
import type { Expression, Program } from '../parser/nodeTypes';
import {
    BuiltInMethodTemplate,
    IncludeStatements,
    OUTPUT_PATH,
    RangeMethods,
    StringStruct,
} from './constants';
import type { ShapeCollector, ShapeInfo } from './shapeCollector';
import fs from 'node:fs';
import { typeGen } from './typeGen';
import type { CodeGenContext } from './context';
import { CodeGenBuiltInMethods } from './builtInMethods';
import path from 'node:path';
import { HandlerRegistry } from './registry';
import { execSync } from 'node:child_process';

export class CodeGen {
    private collector: ShapeCollector;
    private ast: Program;
    private shapeInfoArray: ShapeInfo[] = [];
    private stream!: fs.WriteStream;
    private ctx: CodeGenContext;
    private OUTPUT_BINARY_NAME: string;

    constructor(shapeCollector: ShapeCollector, ast: Program, name: string) {
        this.OUTPUT_BINARY_NAME = name;
        this.collector = shapeCollector;
        this.ast = ast;
        this.startStream();
        this.ctx = {
            stream: this.stream,
            globalScope: globalTable,
            shapeInfo: new Map(),
            generate: (node: any, ctx: CodeGenContext) =>
                this.generate(node, ctx),
        };
        this.OUTPUT_BINARY_NAME = name;
    }

    private runPrePass() {
        this.collector.collectFromSymbolTable(globalTable);
        this.ctx.shapeInfo = this.collector.getAllShapes();
        this.shapeInfoArray = this.collector.topoSort();
        this.collector.collectMethods(this.ast);
    }

    private startStream() {
        const dir = path.dirname(OUTPUT_PATH);
        fs.mkdirSync(dir, { recursive: true });
        this.stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
    }

    public generateCode() {
        // 1. Collect all dependency profiles
        this.runPrePass();

        // 2. Clear out fixed headers and primitives
        this.stream.write(IncludeStatements);
        this.stream.write('\n\n');
        this.stream.write(StringStruct);
        this.stream.write('\n\n');

        // 3. FIX: Safely assert if an int array is actually required

        // 4. Output structural layouts (topologically sorted)
        typeGen(this.shapeInfoArray, this.ctx, this.ast);
        const needsIntRange = this.shapeInfoArray.some(
            (shape) =>
                shape.type.kind === 'array' && shape.type.element.kind === 'int'
        );

        if (needsIntRange) {
            this.stream.write(RangeMethods.emitRuntimeFn());
            this.stream.write('\n\n');
        }
        this.stream.write('\n\n');

        // 5. Output function bodies
        this.generateMethods();
        this.generate(this.ast, this.ctx);

        // 6. FIX: Handle clean stream termination lifetimes
        // We push a null or let the end sequence execute gracefully.
        // If your main block generation code is async in the future,
        // you will want to make this method 'async' and 'await' them before ending.
        this.stream.end();
        this.stream.on('finish', () => {
            execSync(`gcc ${OUTPUT_PATH} -o ${this.OUTPUT_BINARY_NAME} -O2`, {
                stdio: 'inherit',
            });
            // fs.unlinkSync(OUTPUT_PATH); // Wipe temporary C file instantly to hide tracks
        });
    }

    private generate(node: any, ctx: CodeGenContext) {
        const handler = HandlerRegistry[node.type];
        if (!handler) {
            throw new Error(`Unknown node type: ${node.type}`);
        }
        handler(node, ctx);
    }

    private generateMethods() {
        const methods = [...this.collector.getAllMethods().values()];
        for (const method of methods) {
            const reviever = CodeGenBuiltInMethods[method.reciever.type.kind];
            if (!reviever) continue;
            const sig = reviever[method.method];
            if (!sig) continue;
            sig.emitRuntimeFn(
                method.reciever.key,
                method.reciever.type,
                this.ctx
            );
        }
    }
}
