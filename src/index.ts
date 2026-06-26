import { globalErrorBucket, initiateGlobals } from './globals';
import { Lexer } from './lexer/lexer';
import { TokenType } from './lexer/token';
import { Parser } from './parser/parser';
import { editDistance } from './utility/distanceAutoCorrect';

// src/index.ts
const filePath = process.argv[2];

if (!filePath) {
    console.error('Usage: bun run src/index.ts <file.orbit>');
    process.exit(1);
}

const src = await Bun.file(filePath).text();
// ...feed `source` into your Lexer

initiateGlobals(src);

const lexer = new Lexer(src);
const parser = new Parser(lexer);

const program = parser.parseProgram();

console.log(JSON.stringify(program, null, 4));
// after things finished / temp sol for errors
globalErrorBucket.showAll();
