import type { MethodCall } from '../parser/nodeTypes';
import type { OrbType } from '../types';
import { BuiltInMethodTemplate } from './constants';
import type { ShapeInfo } from './shapeCollector';
import { generateExpressionStream } from './handlers/expressions';
import type { CodeGenContext } from './context';

export const StringMethods = {
    concat: (left: string, right: string) =>
        `__orbit_concat_strings(${left}, ${right})`,
    create: (value: string) => `__orbit_create_string("${value}")`,
    index: (index: number, string: string) =>
        `__orbit_string_index(${index}, ${string})`,
};

export type BuiltinCodegenEntry = {
    // emits the call-site C, e.g. `orb_Arr_int32_t_push(&arr, val)`
    emitCall: (shape: ShapeInfo, node: MethodCall, ctx: CodeGenContext) => void;
    // emits the backing function definition once per concrete shape, e.g. Arr_int32_t
    emitRuntimeFn: (
        shapeKey: string,
        elementCType: string,
        ctx: CodeGenContext
    ) => void;
};

export const CodeGenBuiltInMethods: Partial<
    Record<OrbType['kind'], Record<string, BuiltinCodegenEntry>>
> = {
    array: {
        create: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.create;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.args[0]!, ctx); // capacity
                ctx.stream.write(tmpl.sep());
                generateExpressionStream(node.args[1]!, ctx); // initialValues
                ctx.stream.write(tmpl.sep());
                generateExpressionStream(node.args[2]!, ctx); // initialSize
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.create.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        free: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.free;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.free.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        grow: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.grow;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.grow.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        push: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.push;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx); // writing target array
                ctx.stream.write(tmpl.sep());
                generateExpressionStream(node.args[0]!, ctx); // writing pushed value
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.push.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        extend: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.extend;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx);
                ctx.stream.write(tmpl.sep());
                generateExpressionStream(node.args[0]!, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.extend.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        concat: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.concat;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx);
                ctx.stream.write(tmpl.sep());
                generateExpressionStream(node.args[0]!, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.concat.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
        print: {
            emitCall: (
                shape: ShapeInfo,
                node: MethodCall,
                ctx: CodeGenContext
            ) => {
                if (shape.type.kind !== 'array') return;
                const key = shape.key;
                const tmpl = BuiltInMethodTemplate.array.print;

                ctx.stream.write(tmpl.open(key));
                generateExpressionStream(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                elementCType: string,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.print.impl(
                        elementCType,
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
    },
};
