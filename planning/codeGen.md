
# Orb Compiler: Code Generator Architecture

This document outlines the architecture of the Code Generation phase for the Orb compiler. The code generator is a lean, stream-driven engine responsible for executing a final walk over the verified, decorated AST and printing native, highly optimized C syntax directly to the disk.

---

## The Stream-Driven Strategy

Traditional toy compilers generate code by concatenating a single massive string in memory before writing it to a file. For production scale or larger applications, this creates massive memory footprints and degrades compiler performance.

Orb uses a **Stream-Driven Architecture** via Node's native `fs.WriteStream`. Instead of holding code chunks in RAM, individual node handlers accept a reference to an active file system write-stream and write their target syntax chunk directly to the disk in real time.


```

[ Decorated AST ]
│
▼
┌───────────┐
│ Pass 2:   │
│ Code Gen  │ ──► Walks AST recursively
└───────────┘
│
▼   (Writes chunks continuously)
┌───────────┐
│ fs.Stream │ ──► Flushes blocks straight to OS file buffer
└───────────┘
│
▼
[ ._temp.c ]  ──► Written to disk with zero global RAM accumulation

```

---

## 1. Zero-Lookup Mechanical Translation

Because the **Semantic Analyzer** has already processed scopes, validated types, checked for structural errors, and decorated the AST, the Code Generator can operate with absolute trust. 

* **No Symbol Table Lookup:** The generator does not maintain or consult a symbol table. If it encounters a variable, it reads the semantic data already attached directly to that node.
* **No Rule Validation:** The generator never verifies if an expression is valid; it assumes the AST is perfectly formed because any error would have aborted compilation during the Analyzer phase.

---

## 2. Structural Mapping & Central Orchestration

The compilation entry manager initializes the temporary file workspace, streams down the structural architecture, and boots up the translation walk.

```typescript
import * as fs from 'fs';
import { execSync } from 'child_process';

export function compileToBinary(ast: any, outputBinaryName: string) {
    const tempCFile = `.${outputBinaryName}_temp.c`;
    const stream = fs.createWriteStream(tempCFile, { encoding: 'utf8' });

    // 1. Inject Static Runtime Library Headers
    stream.write('#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdbool.h>\n\n');

    // 2. Inject Safe Runtime Memory String Helpers
    stream.write(`
char* orb_string_concat(const char* left, const char* right) {
    if (!left || !right) return NULL;
    size_t left_len = strlen(left);
    size_t right_len = strlen(right);
    size_t total_size = left_len + right_len + 1;
    char* result = (char*)malloc(total_size);
    if (!result) exit(1);
    snprintf(result, total_size, "%s%s", left, right);
    return result;
}\n\n`); // or a loop with all the pre-made runtime helper function and then stream.write(fn) ex -> for fn in fns{ stream.write(fn) }

    // 3. Kick off recursive node streaming
    generateCodeStream(ast, stream);
    stream.end();

    // 4. Invoke the Native Compiler Layer once flushed
    stream.on('finish', () => {
        try {
            // Leverage GCC's full O2 optimization pipeline
            execSync(`gcc ${tempCFile} -o ${outputBinaryName} -O2`, { stdio: 'inherit' });
            fs.unlinkSync(tempCFile); // Wipe temporary C file instantly to hide tracks
        } catch (err) {
            // Keep the .c file alive exclusively if GCC breaks for engine debugging
            console.error(`Build failed. Inspected C output preserved at: ${tempCFile}`);
        }
    });
}

```

---

## 3. Node-Streaming Architecture

The code generator mirrors the recursive tree-walk pattern of the analyzer. Structural nodes route layout tokens, while expression variants drop into a nested top-down expression printer.

```typescript
export function generateCodeStream(node: any, stream: fs.WriteStream): void {
    switch (node.type) {
        case 'Program':
            for (const decl of node.declarations) {
                generateCodeStream(decl, stream);
            }
            break;

        case 'RootOrbitDecl':
            // Maps your main custom block layer directly to C's int main() entry point
            stream.write('int main() {\n');
            generateCodeStream(node.body, stream);
            stream.write('    return 0;\n');
            stream.write('}\n');
            break;

        case 'Block':
            stream.write('    {\n');
            for (const stmt of node.statements) {
                generateCodeStream(stmt, stream);
            }
            stream.write('    }\n');
            break;

        case 'VariableDecl': {
            // Read the exact type string embedded during the analyzer pass
            const cType = node.cTypeString || 'int32_t';
            stream.write(`    ${cType} ${node.name} = `);
            generateExpressionStream(node.initializer, stream);
            stream.write(';\n');
            break;
        }
    }
}

```

---

## 4. Expression Translation & Runtime Hooking

Because raw C handles native operators (+, ==) differently based strictly on memory data formatting, expression trees use branching flags embedded by the analyzer to decide whether to output a standard C expression or intercept it with a customized runtime library function call.

```typescript
function generateExpressionStream(node: any, stream: fs.WriteStream): void {
    switch (node.type) {
        case 'IntLiteral':
            stream.write(node.value);
            break;

        case 'Identifier':
            stream.write(node.name);
            break;

        case 'BinaryExpr':
            // Intercepted String addition handling
            if (node.isStringConcat) {
                stream.write('orb_string_concat(');
                generateExpressionStream(node.left, stream);
                stream.write(', ');
                generateExpressionStream(node.right, stream);
                stream.write(')');
            } else {
                // Flat arithmetic translation
                stream.write('(');
                generateExpressionStream(node.left, stream);
                stream.write(` ${node.operator} `);
                generateExpressionStream(node.right, stream);
                stream.write(')');
            }
            break;
    }
}

