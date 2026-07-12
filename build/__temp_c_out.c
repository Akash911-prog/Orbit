
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <assert.h>
#include <stdint.h>



typedef struct __orbit_String
{
    char *string;
    int length;
    int capacity;
} String;

String __orbit_create_string(char *string);
String __orbit_concat_strings(__orbit_String string1, __orbit_String string2);
void __orbit_free_string(__orbit_String *string);
char __orbit_string_index(int32_t index, __orbit_String string);

String __orbit_create_string(char *string)
{
    __orbit_String s = {0};
    s.string = (char *)malloc(sizeof(char) * (strlen(string) + 1));
    s.length = strlen(string);
    s.capacity = s.length + 1;
    snprintf(s.string, s.capacity, "%s", string);
    return s;
}

String __orbit_concat_strings(__orbit_String *string1, __orbit_String *string2)
{
    size_t length = string1->length + string2->length + 1;
    __orbit_String new_string = {0};
    new_string.string = (char *)malloc(sizeof(char) * length);
    new_string.length = length;
    new_string.capacity = length;
    snprintf(new_string.string, length, "%s%s", string1->string, string2->string);
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
typedef struct __orbit_struct_Point {
    
__orbit_String x = 
;
    
int32_t y = 
;
} __orbit_struct_Point;

typedef struct __orbit_array_int32_t {
    int32_t *data;
    int32_t length;
    int32_t capacity;
} __orbit_array_int32_t;
typedef struct __orbit_struct_A {
    
__orbit_struct_Point p = 
;
} __orbit_struct_A;
void push___orbit_array_int32_t(__orbit_array_int32_t *array, array value) {
    if (!array) return;
    if (array->size == array->capacity) {
        __orbit_array_int32_t_grow(array);
    }
    array->array[array->size++] = value;
}

