
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
    s->string[str_len] = '\0';

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
    new_string->string[total_length] = '\0';

    return new_string;
}

char __orbit_string_index(int32_t index, const __orbit_String *string)
{
    if (!string || !string->string || index < 0 || (size_t)index >= string->length) {
        return '\0'; // Return null terminator on out-of-bounds or NULL
    }
    return string->string[index];
}

void __orbit_free_string(__orbit_String *string)
{
    if (!string) return;
    free(string->string);
    free(string);
}


typedef struct __orbit_array_int32_t {
    int32_t *array;
    size_t length;
    size_t capacity;
} __orbit_array_int32_t;
typedef struct __orbit_struct_Point {
    __orbit_array_int32_t* x;
} __orbit_struct_Point;
typedef struct __orbit_struct_A {
    __orbit_struct_Point p;
} __orbit_struct_A;
__orbit_array_int32_t* __orbit_array_int32_t_create(size_t capacity, const int32_t *initial_values, size_t initial_size) {
    if (initial_size > capacity || capacity == 0 || capacity > (SIZE_MAX / sizeof(int32_t))) {
        return NULL;
    }

    __orbit_array_int32_t *array = (__orbit_array_int32_t *)malloc(sizeof(__orbit_array_int32_t));
    if (!array) return NULL;

    array->array = (int32_t *)malloc(sizeof(int32_t) * capacity);
    if (!array->array) {
        free(array);
        return NULL;
    }

    array->capacity = capacity;
    array->length = 0;

    if (initial_values && initial_size > 0) {
        memcpy(array->array, initial_values, sizeof(int32_t) * initial_size);
        array->length = initial_size;
    }

    return array;
}

__orbit_array_int32_t* __orbit_make_range(int64_t start, int64_t end, bool inclusive)
{
    int64_t diff = end - start;
    int64_t count_64 = inclusive ? (diff + 1) : diff;

    if (count_64 <= 0)
    {
        // Return an empty valid dynamic array
        return __orbit_array_int32_t_create(4, NULL, 0);
    }

    if (count_64 > (int64_t)(SIZE_MAX / sizeof(int32_t)))
    {
        return NULL; // Prevent size_t allocation overflow
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

    int32_t val = (int32_t)start;
    for (size_t i = 0; i < count; i++)
    {
        result->array[i] = val++;
    }

    return result;
}

void __orbit_array_int32_t_free(__orbit_array_int32_t *array) {
    if (!array) return;
    free(array->array);
    free(array);
}

int main () {
char * hello = "string";
  return 0;
}
