import { cleanTemplate } from './helper';

export const OUTPUT_PATH = './build/__temp_c_out.c';

export const IncludeStatements = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <assert.h>
#include <stdint.h>
`;

export const StringStruct = cleanTemplate`
typedef struct __orbit_String
{
    char *string;
    size_t length;
    size_t capacity;
} __orbit_String;

__orbit_String __orbit_create_string(char *string);
__orbit_String __orbit_concat_strings(__orbit_String string1, __orbit_String string2);
void __orbit_free_string(__orbit_String *string);
char __orbit_string_index(int32_t index, __orbit_String string);

__orbit_String __orbit_create_string(char *string)
{
    __orbit_String s = {0};
    s.string = (char *)malloc(sizeof(char) * (strlen(string) + 1));
    s.length = strlen(string);
    s.capacity = s.length + 1;
    snprintf(s.string, s.capacity, "%s", string);
    return s;
}

__orbit_String __orbit_concat_strings(__orbit_String string1, __orbit_String string2)
{
    size_t length = string1.length + string2.length + 1;
    __orbit_String new_string = {0};
    new_string.string = (char *)malloc(sizeof(char) * length);
    new_string.length = length;
    new_string.capacity = length;
    snprintf(new_string.string, length, "%s%s", string1.string, string2.string);
    return new_string;
}

char __orbit_string_index(int32_t index, __orbit_String string)
{
    return string.string[index];
}

void __orbit_free_string(__orbit_String *string)
{
    free(string->string);
    string->string = NULL;
    string->length = 0;
    string->capacity = 0;
}
`;

export const RangeMethods = {
    emitCall: {
        open: () => `__orbit_make_range(`,
        sep: () => `, `,
        close: () => `, )`,
    },
    emitRuntimeFn: () =>
        `
__orbit_array_int32_t __orbit_make_range(size_t start, size_t end, bool inclusive)
{
    int32_t count = inclusive ? (end - start + 1) : (end - start);
    if (count < 0)
        count = 0;

    __orbit_array_int32_t result;
    result.capacity = count > 0 ? count : 1;
    result.array = (int32_t *)malloc(result.capacity * sizeof(int32_t));
    result.length = count;

    int32_t val = (int32_t)start;
    for (int32_t i = 0; i < count; i++)
    {
        result.array[i] = val++;
    }

    return result;
}
`.trim(),
};

export const arrayTemplate = (name: string, type: string) => `
typedef struct ${name} {
    ${type} *array;
    size_t length;
    size_t capacity;
} ${name};
`;

export const tupleTemplate = (name: string, types: string[]) => {
    const fields = types
        .map((type, index) => `${type} _${index};`)
        .join('\n    ');
    return `
typedef struct ${name} {
    ${fields}
} ${name};
`;
};

export const variableDeclTemplate = (
    name: string,
    type: string
) => cleanTemplate`
${type} ${name}`;

export const nullableTemplate = (type: string) => `
typedef struct __orbit_nullable_${type} {
    ${type} value;
    bool is_null;
} __orbit_nullable_${type};
`;

export const BuiltInMethodTemplate = {
    array: {
        create: {
            open: (key: string) => `${key}_create(`,
            sep: () => `, `,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                ${key} ${key}_create(size_t capacity, const ${type} *initial_values, size_t initial_size) {
                    ${key} array = {0};
                    size_t max_elements = SIZE_MAX / sizeof(${type});

                    if (initial_size > capacity || capacity == 0 || capacity > max_elements) {
                        return array;
                    }

                    array.array = (${type} *)malloc(sizeof(${type}) * capacity);
                    if (!array.array) {
                        return array;
                    }

                    array.capacity = capacity;
                    array.length = 0;

                    if (initial_values && initial_size > 0) {
                        memcpy(array.array, initial_values, sizeof(${type}) * initial_size);
                        array.length = initial_size;
                    }

                    return array;
                }
            `,
        },
        free: {
            open: (key: string) => `free_${key}(&`,
            close: () => `)`,
            impl: (key: string) => cleanTemplate`
                void free_${key}(${key} *array) {
                    if (!array) return;
                    free(array->array);
                    array->array = NULL;
                    array->length = 0;
                    array->capacity = 0;
                }
            `,
        },
        grow: {
            open: (key: string) => `${key}_grow(&`,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_grow(${key} *array) {
                    size_t max_elements = SIZE_MAX / sizeof(${type});
                    if (array->capacity >= max_elements) return;

                    size_t newCapacity;
                    if (array->capacity < max_elements / 2) {
                        newCapacity = (array->capacity == 0) ? 4 : array->capacity * 2;
                    } else {
                        if (max_elements - array->capacity < 65536) {
                            newCapacity = max_elements;
                        } else {
                            newCapacity = array->capacity + 65536;
                        }
                    }

                    ${type} *temp = (${type} *)realloc(array->array, sizeof(${type}) * newCapacity);
                    if (!temp) return;

                    array->array = temp;
                    array->capacity = newCapacity;
                }
            `,
        },
        push: {
            open: (key: string) => `push_${key}(&`,
            sep: () => `, `,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_push(${key} *array, ${type} value) {
                    if (!array) return;
                    if (array->length == array->capacity) {
                        ${key}_grow(array);
                    }
                    array->array[array->length++] = value;
                }
            `,
        },
        extend: {
            open: (key: string) => `extend_${key}(&`,
            sep: () => `, `,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_extend(${key} *array, ${key} array2) {
                    if (!array || array2.length == 0 || !array2.array) return;
                    
                    size_t max_elements = SIZE_MAX / sizeof(${type});
                    if (array2.length > max_elements - array->length) return;

                    while ((array->capacity - array->length) < array2.length) {
                        ${key}_grow(array);
                    }

                    memmove(array->array + array->length, array2.array, sizeof(${type}) * array2.length);
                    array->length += array2.length;
                }
            `,
        },
        concat: {
            open: (key: string) => `concat_${key}(`,
            sep: () => `, `,
            close: () => `)`,
            impl: (key: string) => cleanTemplate`
                ${key} ${key}_concat(${key} array1, ${key} array2) {
                    size_t combined_size = array1.length + array2.length;
                    ${key} result = create_${key}(combined_size, NULL, 0);
                    extend_${key}(&result, array1);
                    extend_${key}(&result, array2);
                    return result;
                }
            `,
        },
        print: {
            open: (key: string) => `${key}_print(&`,
            close: () => `)`,
            impl: (type: string, key: string) => {
                let formatSpecifier = '%d';
                if (type.includes('uint64') || type === 'size_t')
                    formatSpecifier = '%llu';
                else if (type.includes('int64')) formatSpecifier = '%lld';
                else if (type.includes('uint')) formatSpecifier = '%u';
                else if (type === 'float' || type === 'double')
                    formatSpecifier = '%f';
                else if (type === 'char') formatSpecifier = '%c';

                return cleanTemplate`
                    void ${key}_print(const ${key} *arr) {
                        if (!arr) {
                            printf("Array: [NULL STRUCT]\\n");
                            return;
                        }

                        printf("Array [size: %zu, capacity: %zu]\\n", arr->length, arr->capacity);

                        if (!arr->array || arr->length == 0) {
                            printf("  Data: []\\n");
                            return;
                        }

                        printf("  Data: [");
                        for (size_t i = 0; i < arr->length; i++) {
                            printf("${formatSpecifier}", arr->array[i]);
                            if (i < arr->length - 1) {
                                printf(", ");
                            }
                        }
                        printf("]\\n");
                    }
                `;
            },
        },
    },
};

export const structMethodNameTemplate = {
    open: (structName: string, methodName: string) =>
        cleanTemplate`__orbit_struct_${structName}_${methodName}(&`,
    sep: () => `, `,
    close: () => `)`,
};

export const ForLoopStarte = (start: string, end: string) =>
    cleanTemplate`for (int32_t __i = ${start}; __i < ${end}; __i++) {\n`;
