import { writeFile } from 'node:fs/promises';
import { SemanticAnalyzer } from './analyzer/analyzer';
import { globalErrorBucket, globalTable, initiateGlobals } from './globals';
import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { CodeGen } from './codeGen/codeGen';
import { ShapeCollector } from './codeGen/shapeCollector';
import path from 'node:path';

// src/index.ts
const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: bun run src/index.ts <file.orbit>');
    process.exit(1);
}

const src = await Bun.file(filePath).text();
// ...feed `source` into your Lexer

initiateGlobals(src);

let program;

try {
    const lexer = new Lexer(src);
    // let current = lexer.nextToken();
    // while (current.type !== TokenType.EOF) {
    //     await appendFile('./temp.json', JSON.stringify(current, null, 4));
    //     current = lexer.nextToken();
    // }
    const parser = new Parser(lexer, process.argv.includes('--debug'));

    program = parser.parseProgram();

    const analyzer = new SemanticAnalyzer(program);
    program = analyzer.analyze();
    const shapeCollector = new ShapeCollector();
    const binaryName = path.basename(filePath, '.orbit');
    const generator = new CodeGen(shapeCollector, program, binaryName);
    generator.generateCode();
} catch (error) {
    console.error(error);
} finally {
    // after things finished / temp sol for errors
    await writeFile('./temp.json', JSON.stringify(program, null, 4));
    globalErrorBucket.showAll();
}
