// tests/analyzer/helpers.ts
import { globalErrorBucket, initiateGlobals } from '../src/globals';
import { SemanticAnalyzer } from '../src/analyzer/analyzer';
import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';

export function runAnalyzer(source: string) {
    initiateGlobals(source);
    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    const ast = parser.parseProgram();
    const analyzer = new SemanticAnalyzer(ast);
    const decoratedAst = analyzer.analyze();
    return { decoratedAst, errors: globalErrorBucket.errors }; // { decoratedAst, errors }
}

// Walks the decorated AST depth-first, returns the Nth node matching `type`.
// Handles arrays and nested objects generically so it doesn't need updating
// every time the AST shape changes.
export function findNode(root: any, type: string, occurrence = 0): any {
    let found: any[] = [];

    function walk(node: any) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }
        if (node.type === type) found.push(node);
        for (const key of Object.keys(node)) {
            if (key === 'type') continue;
            walk(node[key]);
        }
    }

    walk(root);
    return found[occurrence] ?? null;
}

export function findAllNodes(root: any, type: string): any[] {
    let found: any[] = [];
    function walk(node: any) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }
        if (node.type === type) found.push(node);
        for (const key of Object.keys(node)) {
            if (key === 'type') continue;
            walk(node[key]);
        }
    }
    walk(root);
    return found;
}

export function expectNoErrors(errors: any[]) {
    if (errors.length > 0) {
        throw new Error(
            `Expected no errors, got:\n${errors.map((e) => `  ${e.type}: ${e.message} (${e.line}:${e.col})`).join('\n')}`
        );
    }
}
