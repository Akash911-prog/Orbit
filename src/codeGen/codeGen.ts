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
import { getShapeKey, orbTypeToCType } from './helper';
import { generatePrintRuntime } from './builtinFn/print';

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
            scope: globalTable,
            shapeInfo: new Map(),
            generate: (node: any, ctx: CodeGenContext) =>
                this.generate(node, ctx),
        };
        this.OUTPUT_BINARY_NAME = name;
    }

    private runPrePass() {
        this.collector.collectFromSymbolTable(globalTable);
        this.collector.collectMethods(this.ast);
        this.ctx.shapeInfo = this.collector.getAllShapes();
        this.shapeInfoArray = this.collector.topoSort();
    }

    private startStream() {
        const dir = path.dirname(OUTPUT_PATH);
        fs.mkdirSync(dir, { recursive: true });
        this.stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
    }

    public async generateCode() {
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

        this.shapeInfoArray.forEach((shape) => {
            // Only process types that are not copyable
            if (shape.type.copyable) return;

            switch (shape.type.kind) {
                case 'array': {
                    this.stream.write(
                        BuiltInMethodTemplate['array']['create'].impl(
                            orbTypeToCType(shape.type.element),
                            shape.key
                        )
                    );
                    this.stream.write('\n');
                    this.stream.write(
                        BuiltInMethodTemplate['array']['free'].impl(
                            getShapeKey(shape.type)
                        )
                    );
                    this.stream.write('\n\n');
                    break;
                }

                case 'map': {
                    this.stream.write(
                        BuiltInMethodTemplate['map']['create'].impl(
                            orbTypeToCType(shape.type.key),
                            orbTypeToCType(shape.type.value),
                            shape.key
                        )
                    );
                    this.stream.write(
                        BuiltInMethodTemplate['map']['free'].impl(
                            getShapeKey(shape.type)
                        )
                    );
                    break;
                }

                case 'tuple': {
                    this.stream.write(
                        BuiltInMethodTemplate['tuple']['create'].impl(
                            shape.type.elements.map(orbTypeToCType),
                            shape.key
                        )
                    );
                    this.stream.write(
                        BuiltInMethodTemplate['tuple']['free'].impl(
                            getShapeKey(shape.type)
                        )
                    );
                    break;
                }

                case 'String': {
                    this.stream.write(
                        BuiltInMethodTemplate['String']['create'].impl(
                            shape.key
                        )
                    );
                    this.stream.write(
                        BuiltInMethodTemplate['String']['free'].impl(
                            getShapeKey(shape.type)
                        )
                    );
                    break;
                }

                case 'nullable': {
                    this.stream.write(
                        BuiltInMethodTemplate['nullable']['create'].impl(
                            orbTypeToCType(shape.type.inner),
                            shape.key
                        )
                    );
                    this.stream.write(
                        BuiltInMethodTemplate['nullable']['free'].impl(
                            getShapeKey(shape.type)
                        )
                    );
                    break;
                }

                // Primitive types (int, float, bool, char, byte, void, null, str),
                // struct, generic, and unknown require no code emission or are handled elsewhere.
                case 'int':
                case 'float':
                case 'bool':
                case 'char':
                case 'byte':
                case 'str':
                case 'void':
                case 'null':
                case 'struct':
                case 'generic':
                case 'unknown':
                    break;
            }
        });
        this.stream.write('\n\n');
        if (needsIntRange) {
            this.stream.write(RangeMethods.emitRuntimeFn());
            this.stream.write('\n\n');
        }

        // 5. Output function bodies
        this.generateMethods();

        generatePrintRuntime(this.shapeInfoArray, this.stream);

        this.generate(this.ast, this.ctx);

        // 6. FIX: Handle clean stream termination lifetimes
        // We push a null or let the end sequence execute gracefully.
        // If your main block generation code is async in the future,
        // you will want to make this method 'async' and 'await' them before ending.
        this.stream.end();
        await new Promise<void>((resolve, reject) => {
            this.stream.on('finish', () => {
                try {
                    execSync(
                        `gcc ${OUTPUT_PATH} -o build/${this.OUTPUT_BINARY_NAME} -O2`,
                        {
                            stdio: 'inherit',
                        }
                    );
                    fs.unlinkSync(OUTPUT_PATH);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            this.stream.on('error', reject);
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
