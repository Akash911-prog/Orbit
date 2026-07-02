
# Orb Compiler: Semantic Analyzer Architecture

This document outlines the architecture of the Semantic Analysis phase for the Orb compiler. The analyzer is responsible for validating type safety, scoping rules, and structural guardrails on a parsed Abstract Syntax Tree (AST) before the code generation phase.

---

## The Two-Pass Pipeline Overview

To ensure the compiler can scale seamlessly without massive memory allocation or monolithic files, the backend uses a distinct **two-pass traversal pipeline**:


```

[ Pure AST ]
│
▼
┌──────────────┐
│  Pass 1:     │ ──► Reads AST, manages SymbolTable, checks rules,
│  Analyzer    │     and decorates nodes (e.g., node.cTypeString = 'int32_t')
└──────────────┘
│
▼
[ Decorated AST ]
│
▼
┌──────────────┐
│  Pass 2:     │ ──► Walks AST, reads semantic metadata annotations,
│  Code Gen    │     and streams standard C text straight to disk via chunks
└──────────────┘

```

By separating the compilation into these two passes:
1. **The Analyzer** handles all structural context, scope limits, name bindings, and type inference.
2. **The Code Generator** acts as a lightweight, mechanical printer that translates the pre-verified, decorated AST directly to a file stream.

---

## 1. Modular Routing (Avoiding the Monolith)

Traditional compilers use a massive `switch` statement inside a single file to process 40+ different AST node types. To maintain granular file boundaries and simple scaling, the Orb analyzer extracts node handlers into standalone, domain-specific module files (e.g., `declarations.ts`, `statements.ts`, `expressions.ts`).

The main analyzer routes incoming nodes dynamically via a central **Object Lookup Registry**:

```typescript
import { handleProgram, handleBlock } from './handlers/statements';
import { handleVariableDecl } from './handlers/declarations';
import { evaluateExpression } from './handlers/expressions';

type HandlerFn = (node: any, ctx: AnalysisContext) => any;

const NODE_HANDLERS: Record<string, HandlerFn> = {
    'Program': handleProgram,
    'Block': handleBlock,
    'VariableDecl': handleVariableDecl,
    
    // All variant expression types fold into a single recursive pipeline
    'BinaryExpr': evaluateExpression,
    'IntLiteral': evaluateExpression,
    'Identifier': evaluateExpression,
    'CallExpr': evaluateExpression,
};

```

This ensures the central entry point remains trivial in size, providing an $O(1)$ pointer lookup to delegate sub-trees to isolated handler files.

---

## 2. The Context Object (`ctx`)

When splitting code across multiple isolated modules, functions naturally lose access to internal analyzer class states (such as active scoping boundaries or structural compilation error trackers).

The **`AnalysisContext` (`ctx`)** solves this as a unified, static reference bundle passed downward through every node evaluation. Think of it as a shared utility suitcase:

```typescript
import { SymbolTable } from './symbolTable';

export interface AnalysisContext {
    scope: SymbolTable;                  // Active lexical scope registry
    reportError: (msg: string) => void;  // Pushes diagnostic errors to master array
    visit: (node: any, ctx: AnalysisContext) => any; // Radio tool back to central router
}

```

### Argument Mutation Mechanics

* The **`ctx` object is static.** Its core references (`scope`, `reportError`, `visit`) remain consistently accessible during execution blocks.
* The **`node` object is dynamic.** As the visitor travels recursively down sub-trees, child configurations are extracted and supplied as new arguments to `ctx.visit(node.child, ctx)`.

---

## 3. Scoping Boundaries & Block Tracking

Lexical scope boundaries are managed strictly as a pointer chain tree inside the `SymbolTable`. When encountering blocks, handlers shift the context pointer tracking depth seamlessly:

```typescript
// handlers/statements.ts
export function handleBlock(node: any, ctx: AnalysisContext): void {
    // 1. Snapshot parent and spin up a new inner scope child link
    const parentScope = ctx.scope;
    ctx.scope = ctx.scope.enterScope(); 

    // 2. Iterate inner statements utilizing the updated scope suitcase
    for (const stmt of node.statements) {
        ctx.visit(stmt, ctx);
    }

    // 3. Demolish active inner footprint and revert back up the scope chain
    ctx.scope = parentScope;
}

```

---

## 4. AST Node Decoration Architecture

The analyzer does not perform actions blindly. It explicitly "polishes" the AST by embedding configuration footprints onto the active node objects. When the Code Generator processes the node later, it reads these custom flags directly:

```typescript
// handlers/declarations.ts
export function handleVariableDecl(node: any, ctx: AnalysisContext): void {
    const resolvedType = ctx.visit(node.initializer, ctx);

    // Decorate the AST node directly with concrete target C primitives
    if (resolvedType === 'Int') {
        node.cTypeString = 'int32_t';
    } else if (resolvedType === 'String') {
        node.cTypeString = 'char*';
    }

    ctx.scope.define(node.name, {
        kind: 'variable',
        name: node.name,
        type: resolvedType,
        mutable: node.kind === 'var'
    });
}
