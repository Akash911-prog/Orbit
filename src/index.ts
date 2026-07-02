import { globalErrorBucket, initiateGlobals } from './globals';
import { Lexer } from './lexer/lexer';
import { TokenType } from './lexer/token';
import { Parser } from './parser/parser';
import { appendFile } from 'node:fs/promises';

// src/index.ts
const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: bun run src/index.ts <file.orbit>');
    process.exit(1);
}

const src = await Bun.file(filePath).text();
// ...feed `source` into your Lexer

initiateGlobals(src);

try {
    const lexer = new Lexer(src);
    // let current = lexer.nextToken();
    // while (current.type !== TokenType.EOF) {
    //     await appendFile('./temp.json', JSON.stringify(current, null, 4));
    //     current = lexer.nextToken();
    // }
    const parser = new Parser(lexer, process.argv.includes('--debug'));

    const program = parser.parseProgram();

    console.log(JSON.stringify(program, null, 4));
} catch (error) {
    console.error(error);
} finally {
    // after things finished / temp sol for errors
    globalErrorBucket.showAll();
}
