
# Orbit (v0.1 — Development Stage)

Orbit is a systems programming language designed around compile-time **lifecycle safety**. It compiles down to standard C source code.

While modern memory-safe languages guarantee that values are freed *correctly*, they do not guarantee that they are freed at the *right time*, by the *right owner*, or in the *right order*. Resource leaks, dangling handles, and architectural data races are frequently lifecycle management failures rather than pure memory errors. 

Orbit makes responsibility, cleanup order, and boundary-crossing compile-time guarantees.

> **No value outlives its parent.** This is Orbit's single, non-negotiable guarantee.

---

## Core Primitives

Orbit introduces four keyword primitives to manage value lifecycles. They are compiler-enforced constructs, not standard library features.

| Keyword | Role | Syntax |
| :--- | :--- | :--- |
| `orbit` | Declares a named responsibility boundary. Values inside cannot escape without an explicit `drift`. | `orbit connection { ... }` |
| `drift` | Atomically transfers a value between orbits. The value is unreadable and unwritable during transit. | `drift x -> other` |
| `decay` | A guaranteed cleanup block that executes when its target orbit ends. Inner decays execute before outer ones. | `decay { ... }` |
| `nova` | An event-driven execution boundary. Arguments and outer-orbit dependencies are safely inherited via shared drifts. | `nova n receives(s: Signal) { ... }` |

### The Core Language Rule
Ownership in Orbit always has exactly one home. If a shared drift exists between two orbits and one orbit decays, the surviving orbit automatically receives full exclusive ownership. If both decay simultaneously, the inner orbit decays first, the outer orbit inherits ownership, and then the outer orbit decays.

---

## Type System

Orbit is statically typed, and eliminates raw null pointers.

* **Primitives:** Auto-sized (`int`, `float`, `bool`, `char`, `byte`, `str`, `String`) and explicitly sized (`i8` to `u64`, `f32`, `f64`).
* **Composites:** Fixed arrays (`int[]`), maps (`map<str, int>`), tuples (`(int, str)`), and `Result<T, E>` types.
* **Explicit Nullability:** Appending a `?` to a type (e.g., `int?`) creates a nullable type. The compiler enforces an explicit null-check unwrapping before the value can be accessed.
* **Responsible Structs:** Structs own their fields. They can define a `responsible` block detailing obligations (e.g., flushing buffers, closing sockets) that the compiler must statically prove will be fulfilled before the struct's lifecycle ends.

```orbit
struct Connection {
    var socket: Socket;
    var buffer: Buffer;

    responsible socket, buffer {
        flush(socket);
        close(socket);
    }
}

```

---

## Syntax & Architecture Example

The following program moves files concurrently while logging operations, demonstrating nested orbits, synchronized drifts via a common parent mutex, and automatic inheritance upon decay.

```orbit
orbit main {
    let mutex = Mutex::new();
    let log = open_file("transfer.log");

    var files: str[] = [];
    for entry in read_dir("./source") {
        if entry.is_file() {
            files.push(entry.path);
        }
    }

    for path in files {
        let file = open_file(path);
        
        orbit transfer {
            // Synchronized drift verified against the common parent (main)
            drift file ~>* sync(transfer, mutex);
            
            match move_file(file, "./dest") {
                ok(moved) => fire on_log(moved.path),
                err(e) => fire on_log(e.message),
            }
            
            decay transfer {
                close(file);
            }
        }
    }

    // 'log' is automatically shared-drifted into this boundary on access
    nova on_log receives(message: str) {
        write(log, message);
    }

    decay main {
        flush(log);
        close(log);
    }
}

```

---

## Compiler Architecture

The Orbit compiler is implemented in TypeScript and emits clean, portable C source code optimized for GCC or Clang compilation.

```
Source (.orb) ──> Lexer (Hand-written, 2-char lookahead)
                    └──> Parser (Recursive descent)
                           └──> Semantic Analyzer (AST Verification)
                                  ├── Type checking
                                  ├── Lifecycle state tracking (owned | drifting | decayed)
                                  └── Responsible block validation
                                         └──> C Code Generator ──> Binary

```

### Static Analysis State Machine

The compiler tracks every value through three sequential states:

1. `owned`: The value belongs to a specific orbit and can be read or mutated (if declared with `var`).
2. `drifting`: The value is in flight across a boundary and is blocked from any access.
3. `decayed`: The value has been destroyed. Subsequent access triggers a compile-time error.

---

## Project Status

Orbit is currently in **v0.1 (Development Stage)**. The Handwritten Lexer, and Top down recursive handwritten parser are completed. Currently orking on Semantic Analyzer. 

---

## A Note on Design Decisions & Project Scope

Orbit is currently a solo, independent research language. Because it is in its foundational v0.1 stage, the compiler is designed to transpile directly to clean, portable C. This is a deliberate architectural choice: it allows the project to leverage decades of industry-standard optimization pipelines (via GCC and Clang) while keeping the core focus entirely on designing and validating the compile-time lifecycle type checker.

**Collaborations & Engineering:**
I handle technical design, custom full-stack solutions, and low-level tools. If you are engineering a complex system or building something that requires strict architectural problem-solving, reach out. I am selectively open to high-leverage freelance contracts and engineering roles that offer hard technical challenges.
