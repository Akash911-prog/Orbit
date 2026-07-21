import type { OrbType } from '../types';
import { cleanTemplate, orbTypeToCType } from './helper';

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

__orbit_String* __orbit_create_string(const char *string);
__orbit_String* __orbit_concat_strings(const __orbit_String *string1, const __orbit_String *string2);
void __orbit_free_string(__orbit_String *string);
char __orbit_string_index(int32_t index, const __orbit_String *string);

__orbit_String* __orbit_create_string(const char *string)
{
    __orbit_String *s = (__orbit_String *)malloc(sizeof(__orbit_String));
    if (!s) return NULL;

    size_t str_len = string ? strlen(string) : 0;
    
    s->string = (char *)malloc(str_len + 1);
    if (!s->string) {
        free(s);
        return NULL;
    }

    s->length = str_len;
    s->capacity = str_len + 1;

    if (string) {
        memcpy(s->string, string, str_len);
    }
    s->string[str_len] = '\\0';

    return s;
}

__orbit_String* __orbit_concat_strings(const __orbit_String *string1, const __orbit_String *string2)
{
    const char *s1 = (string1 && string1->string) ? string1->string : "";
    const char *s2 = (string2 && string2->string) ? string2->string : "";

    size_t len1 = string1 ? string1->length : 0;
    size_t len2 = string2 ? string2->length : 0;

    if (len1 > SIZE_MAX - len2 - 1) return NULL; // Overflow guard

    size_t total_length = len1 + len2;
    
    __orbit_String *new_string = (__orbit_String *)malloc(sizeof(__orbit_String));
    if (!new_string) return NULL;

    new_string->string = (char *)malloc(total_length + 1);
    if (!new_string->string) {
        free(new_string);
        return NULL;
    }

    new_string->length = total_length;
    new_string->capacity = total_length + 1;

    memcpy(new_string->string, s1, len1);
    memcpy(new_string->string + len1, s2, len2);
    new_string->string[total_length] = '\\0';

    return new_string;
}

char __orbit_string_index(int32_t index, const __orbit_String *string)
{
    if (!string || !string->string || index < 0 || (size_t)index >= string->length) {
        return '\\0'; // Return null terminator on out-of-bounds or NULL
    }
    return string->string[index];
}

void __orbit_free_string(__orbit_String *string)
{
    if (!string) return;
    free(string->string);
    free(string);
}
`;

export const RangeMethods = {
    emitCall: {
        open: () => `__orbit_make_range(`,
        sep: () => `, `,
        close: () => `)`,
    },
    emitRuntimeFn: () =>
        `
__orbit_array_int32_t* __orbit_make_range(int64_t start, int64_t end, bool inclusive)
{
    bool descending = start > end;
    int64_t diff = descending ? ((int64_t)start - end) : ((int64_t)end - start);
    int64_t count_64 = inclusive ? (diff + 1) : diff;

    if (count_64 <= 0)
    {
        return __orbit_array_int32_t_create(4, NULL, 0);
    }

    if (count_64 > (int64_t)(SIZE_MAX / sizeof(int32_t)))
    {
        return NULL;
    }

    size_t count = (size_t)count_64;

    __orbit_array_int32_t *result = (__orbit_array_int32_t *)malloc(sizeof(__orbit_array_int32_t));
    if (!result) return NULL;

    result->array = (int32_t *)malloc(count * sizeof(int32_t));
    if (!result->array)
    {
        free(result);
        return NULL;
    }

    result->capacity = count;
    result->length = count;

    int32_t val = start;
    int32_t step = descending ? -1 : 1;
    for (size_t i = 0; i < count; i++)
    {
        result->array[i] = val;
        val += step;
    }

    return result;
}
`.trim(),
};

export const arrayTemplate = (name: string, type: string) => `
typedef struct ${name} {
    ${type} ${type === '__orbit_String' ? '**' : '*'}array;
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
    type: string,
    is_pointer?: boolean
) => cleanTemplate`
${type}${is_pointer ? '*' : ''} ${name}
`;

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
                ${key}* ${key}_create(size_t capacity, ${type} ${type === '__orbit_String' ? '**' : '*'}initial_values, size_t initial_size) {
                    if (initial_size > capacity || capacity == 0 || capacity > (SIZE_MAX / sizeof(${type}${type === '__orbit_String' ? '*' : ''}))) {
                        return NULL;
                    }

                    ${key} *array = (${key} *)malloc(sizeof(${key}));
                    if (!array) return NULL;

                    array->array = (${type} ${type === '__orbit_String' ? '**' : '*'})malloc(sizeof(${type}${type === '__orbit_String' ? '*' : ''}) * capacity);
                    if (!array->array) {
                        free(array);
                        return NULL;
                    }

                    array->capacity = capacity;
                    array->length = 0;

                    if (initial_values && initial_size > 0) {
                        memcpy(array->array, initial_values, sizeof(${type}${type === '__orbit_String' ? '*' : ''}) * initial_size);
                        array->length = initial_size;
                    }

                    return array;
                }
            `,
        },
        free: {
            open: (key: string) => `${key}_free(`,
            close: () => `)`,
            impl: (key: string) => {
                if (key === '__orbit_array_String') {
                    return cleanTemplate`
                        void ${key}_free(${key} *array) {
                            if (!array) return;
                            for (size_t i = 0; i < array->length; i++) {
                                __orbit_free_string(array->array[i]);
                            }
                            free(array->array);
                            free(array);
                        }
                    `;
                }
                return cleanTemplate`
                void ${key}_free(${key} *array) {
                    if (!array) return;
                    free(array->array);
                    free(array);
                }
            `;
            },
        },
        grow: {
            open: (key: string) => `${key}_grow(`,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_grow(${key} *array) {
                    if (!array) return;
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
            open: (key: string) => `${key}_push(`,
            sep: () => `, `,
            close: () => `);\n`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_push(${key} *array, ${type} value) {
                    if (!array) return;
                    if (array->length == array->capacity) {
                        ${key}_grow(array);
                        if (array->length == array->capacity) return; // Allocation failed
                    }
                    array->array[array->length++] = value;
                }
            `,
        },
        extend: {
            open: (key: string) => `${key}_extend(`,
            sep: () => `, `,
            close: () => `)`,
            impl: (type: string, key: string) => cleanTemplate`
                void ${key}_extend(${key} *array, ${key} *array2) {
                    if (!array || !array2 || array2->length == 0 || !array2->array) return;
                    
                    size_t max_elements = SIZE_MAX / sizeof(${type});
                    if (array2->length > max_elements - array->length) return;

                    while ((array->capacity - array->length) < array2->length) {
                        size_t prev_capacity = array->capacity;
                        ${key}_grow(array);
                        if (array->capacity == prev_capacity) return; // Guard against OOM infinite loop
                    }

                    memmove(array->array + array->length, array2->array, sizeof(${type}) * array2->length);
                    array->length += array2->length;
                }
            `,
        },
        concat: {
            open: (key: string) => `${key}_concat(`,
            sep: () => `, `,
            close: () => `)`,
            impl: (key: string) => cleanTemplate`
                ${key}* ${key}_concat(${key} *array1, ${key} *array2) {
                    if (!array1 || !array2) return NULL;

                    size_t combined_size = array1->length + array2->length;
                    if (combined_size == 0) combined_size = 4;

                    ${key} *result = ${key}_create(combined_size, NULL, 0);
                    if (!result) return NULL;

                    ${key}_extend(result, array1);
                    ${key}_extend(result, array2);
                    return result;
                }
            `,
        },
        print: {
            open: (key: string) => `${key}_print(`,
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
    `for (int32_t __i = ${start}; __i < ${end}; __i++) {\n`;

// in BuiltInMethodTemplate['nullable']['create'].impl(cType, shapeKey)

export function isPointerType(cType: OrbType): boolean {
    return !cType.copyable;
}
export function nullableCreateTemplate(
    type: OrbType,
    shapeKey: string
): string {
    const structName = `${shapeKey}`;
    const nullValue = isPointerType(type) ? 'NULL' : '0';

    return `
static inline ${structName} ${structName}_create_null(void) {
    return (${structName}){ .value = ${nullValue}, .is_null = true };
}

static inline ${structName} ${structName}_create_value(${orbTypeToCType(type.inner)} v) {
    return (${structName}){ .value = v, .is_null = false };
}
`;
}
