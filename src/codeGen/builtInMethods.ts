import type { MethodCall } from '../parser/nodeTypes';
import type { OrbType } from '../types';
import fs from 'fs';
import { CodeGen } from './codeGen';

export const StringMethods = {
    concat: (left: string, right: string) =>
        `__orbit_concat_strings(${left}, ${right})`,
    create: (value: string) => `__orbit_create_string("${value}")`,
    index: (index: number, string: string) =>
        `__orbit_string_index(${index}, ${string})`,
};

export type BuiltinCodegenEntry = {
    // emits the call-site C, e.g. `orb_Arr_int32_t_push(&arr, val)`
    emitCall: (
        shapeKey: string,
        node: MethodCall,
        stream: fs.WriteStream
    ) => void;
    // emits the backing function definition once per concrete shape, e.g. Arr_int32_t
    emitRuntimeFn: (
        shapeKey: string,
        elementCType: string,
        stream: fs.WriteStream
    ) => void;
};

export const CodeGenBuiltInMethods: Partial<
    Record<OrbType['kind'], Record<string, BuiltinCodegenEntry>>
> = {
    array: {
        push: {
            emitCall: (
                shapeKey: string,
                node: MethodCall,
                stream: fs.WriteStream
            ) => {
                stream.write(`orb_${shapeKey}_push(`);
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                stream: fs.WriteStream
            ) => {
                stream.write(
                    `void orb_${shapeKey}_push(${elementCType} *arr, ${elementCType} val) {\n`
                );
                stream.write('    arr[arr_len++] = val;\n');
                stream.write('}\n');
            },
        },
    },
};
