import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SemanticAnalyzer } from './analyzer/analyzer';
import { globalErrorBucket, globalTable, initiateGlobals } from './globals';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { CodeGen } from './codeGen/codeGen';
import { ShapeCollector } from './codeGen/shapeCollector';

const filePath = process.argv[2];
const debug = process.argv.includes('--debug');

if (!filePath) {
    console.error('Usage: orbitc <file.orbit>');
    process.exit(1);
}

const src = await Bun.file(filePath).text();
initiateGlobals(src);

let program;
let exitCode = 0;

try {
    const lexer = new Lexer(src);
    const parser = new Parser(lexer, debug);
    program = parser.parseProgram();

    const analyzer = new SemanticAnalyzer(program);
    program = analyzer.analyze();

    const shapeCollector = new ShapeCollector();
    const binaryName = path.basename(filePath, '.orb');
    const generator = new CodeGen(shapeCollector, program, binaryName);
    await generator.generateCode();
} catch (error) {
    console.error(error);
    exitCode = 1;
} finally {
    if (debug && program) {
        await writeFile(
            path.join(process.cwd(), 'temp.json'),
            JSON.stringify(program, null, 4)
        );
    }

    if (globalErrorBucket.hasErrors?.() ?? true) {
        globalErrorBucket.showAll();
    }

    process.exit(exitCode);
}
