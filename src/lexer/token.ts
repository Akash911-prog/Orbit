export enum TokenType {
    // Section 7: Lexical Tokens
    Identifier = 'IDENTIFIER',
    IntLiteral = 'IntLiteral',
    StrLiteral = 'StrLiteral',
    BoolLiteral = 'BoolLiteral',

    // Keywords (Derived from Identifiers during scanning)
    KeywordOrbit = 'orbit',
    KeywordMain = 'main',
    KeywordLet = 'let',
    KeywordInt = 'int',
    KeywordStr = 'str',
    KeywordBool = 'bool',
    KeywordStruct = 'struct',
    KeywordFn = 'fn',
    KeywordVar = 'var',
    // Control flow keywords you'll need
    KeywordIf = 'if',
    KeywordElse = 'else',
    KeywordFor = 'for',
    KeywordWhile = 'while',
    KeywordLoop = 'loop',
    KeywordIn = 'in',
    KeywordReturn = 'return',
    KeywordBreak = 'break',
    KeywordContinue = 'continue',
    KeywordMatch = 'match',
    KeywordTrue = 'true',
    KeywordFalse = 'false',

    // Types you declared as MVP
    KeywordFloat = 'float',

    // Symbols you're missing
    Dot = '.', // member access — conn.socket
    Arrow = '->', // will be drift later, but also return type? no wait you use :
    FatArrow = '=>', // match arms
    DotDot = '..', // range exclusive
    DotDotEquals = '..=', // range inclusive
    OpenBracket = '[', // arrays
    CloseBracket = ']', // arrays

    // Float literal
    FloatLiteral = 'FloatLiteral',

    // Structural Operators & Punctuators
    Colon = ':',
    OpenBrace = '{',
    CloseBrace = '}',
    OpenParen = '(',
    CloseParen = ')',
    Comma = ',',
    Semicolon = ';',

    // Assignment Operators
    Equals = '=',
    PlusEquals = '+=',
    MinusEquals = '-=',
    StarEquals = '*=',
    SlashEquals = '/=',
    PercentEquals = '%=',

    // Binary Arithmetic Operators
    Add = '+',
    Subtract = '-',
    Multiply = '*',
    Divide = '/',
    Modulo = '%',

    // Binary Logical Operators
    LogicalAnd = '&&',
    LogicalOr = '||',

    // Binary Comparison / Relational Operators
    DoubleEquals = '==',
    NotEquals = '!=',
    LessThan = '<',
    LessThanEquals = '<=',
    GreaterThan = '>',
    GreaterThanEquals = '>=',

    // Unary Operators
    LogicalNot = '!',
    Increment = '++',
    Decrement = '--',

    // End of File
    EOF = 'EOF',

    Error = 'Error',
    KeywordNova = 'nova',
    KeywordDrift = 'drift',
    KeywordDecay = 'decay',
    KeywordFire = 'fire',
    KeywordNull = 'null',
    QuestionMark = '?',
    KeywordMap = 'Map',
    KeywordResult = 'Result',
    KeywordI8 = 'i8',
    KeywordI16 = 'i16',
    KeywordI32 = 'i32',
    KeywordI64 = 'i64',
    KeywordU8 = 'u8',
    KeywordU16 = 'u16',
    KeywordU32 = 'u32',
    KeywordU64 = 'u64',
    KeywordF32 = 'f32',
    KeywordF64 = 'f64',
    KeywordChar = 'char',
    KeywordByte = 'byte',
    KeywordString = 'String',
    Underscore = '_',
    KeywordInto = 'into',
    KeywordShared = 'shared',
    KeywordSync = 'sync',
    KeywordResponsible = 'responsible',
}

export interface Token {
    type: TokenType;
    value: string; // The exact text matched (lexeme)
    line: number; // Crucial for error tracking
    col: number;
}
