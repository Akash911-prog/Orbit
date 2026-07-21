import { BuiltInMethodTemplate } from '../constants';
import { cleanTemplate, orbTypeToCType } from '../helper';
import type { ShapeInfo } from '../shapeCollector';
import fs from 'node:fs';

const genericBraches = [
    'int: _print_int32_t',
    'double: _print_double',
    'char*: _print_cstring',
    'const char*: _print_cstring',
    'bool: _print_bool',
    '__orbit_String*: _print_orbit_string',
];

const PrintFunctions = {
    staticFns:
        () => cleanTemplate`static inline void _print_int32_t(int v)            { printf("%d\\n", v); }
static inline void _print_double(double v)      { printf("%g\\n", v); }
static inline void _print_cstring(const char* v){ printf("%s\\n", v ? v : "(null)"); }
static inline void _print_bool(bool v)          { printf("%s\\n", v ? "true" : "false"); } \n\n`,
    string: () => cleanTemplate`
void _print_orbit_string(const __orbit_String *s) {
    if (!s || !s->string) { printf("(null)\\n"); return; }
    printf("%s\\n", s->string);
}\n\n
    `,
    arrayString: () => cleanTemplate`
    void _print_orbit_string_array(__orbit_array_String *str)
{
    printf("[");
    for (size_t i = 0; i < str->length; i++)
    {
        printf("'");
        printf("%s", str->array[i]->string);
        printf("'");
        if (i < str->length - 1)
            printf(", ");
    }
    printf("]\\n");
}\n\n
    `,
    array: (type: string) => cleanTemplate`
    void _print_orbit_array_${type}(__orbit_array_${type} *array) {
    printf("[");
    for (size_t i = 0; i < array->length; i++)
    {
        _print_${type}(array->array[i]);
        if (i < array->length - 1)
            printf(", ");
    }
    printf("]\\n");
}\n\n
    `,

    nullable: () => {},
};

function generatePrintGenericMacro(branches: string[]): string {
    const body = branches.map((branch) => `    ${branch}`).join(', \\\n');

    return `#define __orbit_builtin_print(x) _Generic((x), \\\n${body} \\\n)(x) \n\n`;
}

export function generatePrintRuntime(
    shapeInfo: ShapeInfo[],
    stream: fs.WriteStream
) {
    stream.write(PrintFunctions.staticFns());
    stream.write('\n\n');
    stream.write(PrintFunctions.string());
    shapeInfo.forEach((shape) => {
        switch (shape.type.kind) {
            case 'array': {
                const key = shape.key;
                if (shape.type.element.kind === 'String') {
                    const tmpl = PrintFunctions.arrayString;
                    stream.write(tmpl());
                    genericBraches.push(
                        `__orbit_array_String *: _print_orbit_string_array`
                    );
                } else {
                    const tmpl = PrintFunctions.array(
                        orbTypeToCType(shape.type.element)
                    );
                    stream.write(tmpl);
                    genericBraches.push(
                        `${orbTypeToCType(
                            shape.type
                        )}: _print_orbit_array_${orbTypeToCType(
                            shape.type.element
                        )}`
                    );
                }
                break;
            }
            case 'tuple': {
                const key = shape.key;
                //TODO: ADD TUPLES
                break;
            }
            case 'struct': {
                const key = shape.key;
                break;
            }
            case 'nullable': {
                const key = shape.key;
                break;
            }
            default:
                break;
        }
    });
    stream.write('\n\n');
    stream.write(generatePrintGenericMacro(genericBraches));
}
