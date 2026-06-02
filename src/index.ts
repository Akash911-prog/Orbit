import { Lexer } from './lexer/lexer';

const lexer = new Lexer("hello 'world'");
console.log(lexer.tokenize());
