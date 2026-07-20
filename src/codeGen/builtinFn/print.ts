import { BuiltInMethodTemplate } from '../constants';
import { cleanTemplate, orbTypeToCType } from '../helper';
import type { ShapeInfo } from '../shapeCollector';
import fs from 'node:fs';

const genericBraches = [
    'int: _print_int',
    'double: _print_double',
    'char*: _print_cstring',
    'const char*: _print_cstring',
    'bool: _print_bool',
    '__orbit_String*: _print_orbit_string',
];

const PrintFunctions = {
    staticFns:
        () => cleanTemplate`static inline void _print_int(int v)            { printf("%d\\n", v); }
static inline void _print_double(double v)      { printf("%g\\n", v); }
static inline void _print_cstring(const char* v){ printf("%s\\n", v ? v : "(null)"); }
static inline void _print_bool(bool v)          { printf("%s\\n", v ? "true" : "false"); }`,
    string: () => cleanTemplate`
    void _print_orbit_string(const __orbit_String *s) {
    if (!s || !s->string) { printf("(null)\n"); return; }
    printf("%s\n", s->string);
}
    `,
    arrayString: () => cleanTemplate`
    void _print_orbit_array_string(const __orbit_array_String *s) {
    if (!)
}
    `,
};

export function generatePrintRuntime(
    shapeInfo: ShapeInfo[],
    stream: fs.WriteStream
) {
    shapeInfo.forEach((shape) => {
        switch (shape.type.kind) {
            case 'array': {
                const key = shape.key;
                if (shape.type.element.kind === 'String') {
                }
                break;
            }
            case 'tuple': {
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.tuple.print;
                tmpl.emitRuntimeFn(key, shape.type, this.ctx);
                break;
            }
            case 'struct': {
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.struct.print;
                tmpl.emitRuntimeFn(key, shape.type, this.ctx);
                break;
            }
            default:
                break;
        }
    });
}
