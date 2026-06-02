export enum TokenType {
    // Section 7: Lexical Tokens
    Identifier = 'IDENTIFIER',
    IntLiteral = 'INT_LITERAL',
    StrLiteral = 'STR_LITERAL',
    BoolLiteral = 'BOOL_LITERAL',

    // Keywords (Derived from Identifiers during scanning)
    KeywordOrbit = 'orbit',
    KeywordMain = 'main',
    KeywordLet = 'let',
    KeywordInt = 'int',
    KeywordStr = 'str',
    KeywordBool = 'bool',

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
}

export interface Token {
    type: TokenType;
    value: string; // The exact text matched (lexeme)
    line: number; // Crucial for error tracking
    col: number;
}
