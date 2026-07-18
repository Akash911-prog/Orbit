
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <assert.h>
#include <stdint.h>


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


typedef struct __orbit_array_int32_t {
    int32_t *array;
    size_t size;
    size_t capacity;
} __orbit_array_int32_t;
typedef struct __orbit_struct_Point {
    __orbit_array_int32_t x;
} __orbit_struct_Point;
typedef struct __orbit_struct_A {
    __orbit_struct_Point p;
} __orbit_struct_A;
__orbit_array_int32_t __orbit_make_range(size_t start, size_t end, bool inclusive)
{
    int32_t count = inclusive ? (end - start + 1) : (end - start);
    if (count < 0)
        count = 0;

    __orbit_array_int32_t result;
    result.capacity = count > 0 ? count : 1;
    result.array = (int32_t *)malloc(result.capacity * sizeof(int32_t));
    result.size = count;

    int32_t val = (int32_t)start;
    for (int32_t i = 0; i < count; i++)
    {
        result.array[i] = val++;
    }

    return result;
}



void __orbit_array_int32_t_grow(__orbit_array_int32_t *array) {
    size_t max_elements = SIZE_MAX / sizeof(int32_t);
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

    int32_t *temp = (int32_t *)realloc(array->array, sizeof(int32_t) * newCapacity);
    if (!temp) return;

    array->array = temp;
    array->capacity = newCapacity;
}

void __orbit_array_int32_t_push(__orbit_array_int32_t *array, int32_t value) {
    if (!array) return;
    if (array->size == array->capacity) {
        __orbit_array_int32_t_grow(array);
    }
    array->array[array->size++] = value;
}

int main () {
printf("Hello, World!\n");
return 0;
}
