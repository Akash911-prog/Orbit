// Assuming OrbTypes.int(), OrbTypes.str(), and OrbTypes.void() exist in your codebase

import { OrbTypes } from '../types';
import type { SymbolEntry } from './symbolTable';

export const BUILTIN_FUNCTIONS_MAP: Record<string, SymbolEntry> = {
    print: {
        kind: 'function',
        name: 'print',
        params: [{ name: 'str', type: OrbTypes.str() }],
        returnType: OrbTypes.void(),
        builtin: true,
    },
    len: {
        kind: 'function',
        name: 'len',
        params: [{ name: 'str', type: OrbTypes.str() }],
        returnType: OrbTypes.int(),
        builtin: true,
    },
    strToInt: {
        kind: 'function',
        name: 'toInt',
        params: [{ name: 'str', type: OrbTypes.str() }],
        returnType: OrbTypes.int(),
        builtin: true,
    },
    intToStr: {
        kind: 'function',
        name: 'toStr',
        params: [{ name: 'val', type: OrbTypes.int() }],
        returnType: OrbTypes.str(),
        builtin: true,
    },
};
