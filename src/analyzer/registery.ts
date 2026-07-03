import type { OrbType } from '../types';
import type { AnalyzerContext } from './context';
import { handleProgram } from './handlers/program';

export type HandlerFn = (node: any, ctx: AnalyzerContext) => OrbType;
export const HandlerRegistry: Record<string, HandlerFn> = {
    Program: handleProgram,
};
