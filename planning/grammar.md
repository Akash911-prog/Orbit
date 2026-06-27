# Orbit Language — Complete EBNF Grammar

> **Notation:** `{ x }` = zero or more, `[ x ]` = optional, `( x | y )` = choice, `"x"` = terminal keyword or symbol.

---

## 1. Program & Source Structure

```ebnf
Program             = { TopLevelDeclaration } ;

TopLevelDeclaration = VariableDecl
                    | FunctionDecl
                    | StructDecl
                    | NovaDecl
                    | RootOrbitDecl ;

RootOrbitDecl       = "orbit" "main" Block ;

Block               = "{" { Statement } "}" ;
```

---

## 2. Statements

```ebnf
Statement           = VariableDecl
                    | Assignment
                    | IfStatement
                    | ForStatement
                    | WhileStatement
                    | LoopStatement
                    | MatchStatement
                    | OrbitBlock
                    | DriftStatement
                    | DecayBlock
                    | FireStatement
                    | ReturnStatement
                    | BreakStatement
                    | ContinueStatement
                    | ExpressionStatement ;

VariableDecl        = ( "let" | "var" ) Identifier ":" Type "=" Expression ;
Assignment          = Identifier { "." Identifier } "=" Expression ;
ReturnStatement     = "return" [ Expression ] ;
BreakStatement      = "break" [ Identifier ] ;         (* Identifier for labeled loop break *)
ContinueStatement   = "continue" ;
ExpressionStatement = Expression ;
```

---

## 3. Control Flow

```ebnf
IfStatement         = "if" Expression Block
                      { "else" "if" Expression Block }
                      [ "else" Block ] ;

ForStatement        = "for" Identifier "in" Expression Block ;

WhileStatement      = "while" Expression Block ;

LoopStatement       = "loop" Block ;

MatchStatement      = "match" Expression "{" MatchArm { "," MatchArm } [ "," ] "}" ;
MatchArm            = MatchPattern "=>" ( Expression | Block ) ;

MatchPattern        = Literal
                    | Identifier
                    | "_"
                    | Identifier "(" { MatchPattern { "," MatchPattern } } ")" ;
                    (* constructor patterns: ok(data), err(e), Some(x) *)
```

---

## 4. Orbit Lifecycle Primitives

```ebnf
OrbitBlock          = "orbit" Identifier Block ;

DriftStatement      = "drift" Identifier ( "->" | "into" ) DriftTarget
                    | "drift" Identifier ("->" | "into" ) "shared" "(" Identifier "," Identifier ")"
                    | "drift" Identifier ("->" | "into" ) "sync"   "(" Identifier "," Identifier ")" ;

DriftTarget         = Identifier ;                          (* exclusive drift *)

DecayBlock          = "decay" [ Identifier ] Block ;
                    (* no identifier = nearest orbit *)
                    (* with identifier = targeted orbit, inner orbits decay first *)

NovaDecl            = "nova" Identifier "receives" "(" [ ParameterList ] ")" Block ;

FireStatement       = "fire" Identifier "(" [ ArgumentList ] ")" ;
```

---

## 5. Functions

```ebnf
FunctionDecl        = "fn" Identifier [ "<" Identifier ">" ]
                      "(" [ ParameterList ] ")"
                      [ ":" Type ]
                      Block ;

ParameterList       = Parameter { "," Parameter } ;
Parameter           = Identifier ":" Type ;

FunctionCall        = Identifier "(" [ ArgumentList ] ")" ;
ArgumentList        = Expression { "," Expression } ;
```

---

## 6. Structs

```ebnf
StructDecl          = "struct" Identifier [ "<" Identifier ">" ]
                      "{" { StructMember } "}" ;

StructMember        = VariableDecl
                    | FunctionDecl
                    | ResponsibleBlock ;

ResponsibleBlock    = "responsible" { Identifier } [ Block ] ;
                    (* identifiers = values struct is responsible for freeing *)
                    (* block = actions that must run on lifecycle end          *)
                    (* unmet responsibility = compile error                   *)

StructInit          = Identifier "{" [ FieldInit { "," FieldInit } ] "}" ;
FieldInit           = Identifier ":" Expression ;
```

---

## 7. Types

```ebnf
Type                = BaseType [ "?" ]                      (* nullable: int?    *)
                    | Type "[]"                             (* array:   int[]    *)
                    | "map" "<" Type "," Type ">"           (* map:     map<str,int> *)
                    | "(" Type { "," Type } ")"             (* tuple:   (int,str)*)
                    | "Result" "<" Type "," Type ">"        (* result:  Result<str,Error> *)
                    | Identifier [ "<" Type ">" ] ;         (* generic: Stack<T> *)

BaseType            = "int"
                    | "i8"  | "i16" | "i32" | "i64"
                    | "u8"  | "u16" | "u32" | "u64"
                    | "f32" | "f64" | "float"
                    | "bool"
                    | "char"
                    | "byte"
                    | "str"
                    | "String" ;
```

---

## 8. Expressions

Expressions are ordered from lowest to highest precedence.

```ebnf
Expression          = LogicalExpr [ ( ".." | "..=" ) LogicalExpr ] ;
                    (* ranges sit at the outermost expression layer *)

LogicalExpr         = EqualityExpr { ( "&&" | "||" ) EqualityExpr } ;

EqualityExpr        = RelationalExpr { ( "==" | "!=" ) RelationalExpr } ;

RelationalExpr      = AdditiveExpr { ( "<" | "<=" | ">" | ">=" ) AdditiveExpr } ;

AdditiveExpr        = MultiplicativeExpr { ( "+" | "-" ) MultiplicativeExpr } ;

MultiplicativeExpr  = UnaryExpr { ( "*" | "/" | "%" ) UnaryExpr } ;

UnaryExpr           = ( "!" | "-" ) UnaryExpr
                    | NullCheckExpr ;

NullCheckExpr       = PrimaryExpr [ "?" ] ;
                    (* if y? {} — nullable check/unwrap *)

PrimaryExpr         = Atom { "." Identifier [ "(" [ ArgumentList ] ")" ] } ;
                    (* chains member access and method calls left to right *)

Atom                = Literal
                    | Identifier
                    | FunctionCall
                    | StructInit
                    | "(" Expression ")"
                    | "null" ;
```

---

## 9. Literals & Lexical Tokens

```ebnf
Literal             = IntLiteral
                    | FloatLiteral
                    | StrLiteral
                    | BoolLiteral ;

IntLiteral          = Digit { Digit } ;
FloatLiteral        = Digit { Digit } "." { Digit } ;
StrLiteral          = '"' { Character } '"' ;
BoolLiteral         = "true" | "false" ;

Identifier          = Letter { Letter | Digit | "_" } ;

Letter              = "a" | ... | "z" | "A" | ... | "Z" | "_" ;
Digit               = "0" | ... | "9" ;
Character           = ? Any Unicode character except '"' or "\" ? ;
```

---

## 10. Keywords (Reserved)

The following identifiers are reserved and cannot be used as variable or function names:

```
orbit   drift   decay   nova    fire
let     var     fn      struct  responsible
if      else    for     while   loop
match   return  break   continue
in      into    shared  sync    receives
true    false   null
int     i8      i16     i32     i64
u8      u16     u32     u64     f32     f64
float   bool    char    byte    str     String
Result  map
```

---

## 11. Key Grammar Design Notes

- **Semicolon-free:** Statements are newline or whitespace separated. No trailing `;` required.
- **No parentheses on conditions:** `if x > 0 {}` is standard. `if (x > 0) {}` is a syntax error unless evaluating a grouped sub-expression.
- **`:` vs `=>`:** Strict segregation enforced. `:` is used only for type annotation in declarations and parameters. `=>` is used only in match arms.
- **Unary `?` for nullables:** `y?` in an expression context is a null check/unwrap. `int?` in a type context declares a nullable type. Context disambiguates.
- **`responsible` block:** If a struct declares a `responsible` block and the compiler cannot prove it runs on all lifecycle paths, it is a **compile error** — not a warning.
- **Constructor patterns in match:** `ok(data)` and `err(e)` are constructor patterns, enabling clean `Result` destructuring directly in match arms.
- **Left-recursive chaining:** Member access and method calls chain left-to-right in `PrimaryExpr` via iteration, avoiding left-recursion in the recursive descent parser.
- **Break with label:** `break identifier` targets a specific named loop, equivalent to labeled break in other languages.
- **Drift operators:** `->` and `into` are interchangeable exclusive drift forms. `~>>` is shared-read drift. `~>*` is synchronized drift requiring a mutex owned by the common parent orbit.
```