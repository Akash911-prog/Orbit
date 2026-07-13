import type { MethodCall } from '../parser/nodeTypes';
import type { OrbType } from '../types';
import { BuiltInMethodTemplate } from './constants';
import type { ShapeInfo } from './shapeCollector';
import type { CodeGenContext } from './context';
import { orbTypeToCType } from './helper';

export const StringMethods = {
    concat: {
        open: () => `__orbit_concat_strings(`,
        sep: () => `, `,
        close: () => `)`,
    },
    create: {
        open: (value: string) => `__orbit_create_string("${value}"`,
        sep: () => `, `, // Keep this in case you add memory arenas later
        close: () => `)`,
    },
    index: {
        open: (index: number) => `__orbit_string_index(${index}`,
        sep: () => `, `,
        close: () => `)`,
    },
};

export type BuiltinCodegenEntry = {
    // emits the call-site C, e.g. `orb_Arr_int32_t_push(&arr, val)`
    emitCall: (shape: ShapeInfo, node: MethodCall, ctx: CodeGenContext) => void;
    // emits the backing function definition once per concrete shape, e.g. Arr_int32_t
    emitRuntimeFn: (
        shapeKey: string,
        shapeType: OrbType,
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
                ctx.generate(node.args[0]!, ctx); // capacity
                ctx.stream.write(tmpl.sep());
                ctx.generate(node.args[1]!, ctx); // initialValues
                ctx.stream.write(tmpl.sep());
                ctx.generate(node.args[2]!, ctx); // initialSize
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.create.impl(
                        orbTypeToCType(shapeType.element),
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
                ctx.generate(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.free.impl(shapeKey) + '\n\n'
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
                ctx.generate(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.grow.impl(
                        orbTypeToCType(shapeType.element),
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
                ctx.generate(node.object, ctx); // writing target array
                ctx.stream.write(tmpl.sep());
                ctx.generate(node.args[0]!, ctx); // writing pushed value
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.push.impl(
                        orbTypeToCType(shapeType.element),
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
                ctx.generate(node.object, ctx);
                ctx.stream.write(tmpl.sep());
                ctx.generate(node.args[0]!, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.extend.impl(
                        orbTypeToCType(shapeType.element),
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
                ctx.generate(node.object, ctx);
                ctx.stream.write(tmpl.sep());
                ctx.generate(node.args[0]!, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.concat.impl(shapeKey) + '\n\n'
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
                ctx.generate(node.object, ctx);
                ctx.stream.write(tmpl.close());
            },
            emitRuntimeFn: (
                shapeKey: string,
                shapeType: OrbType,
                ctx: CodeGenContext
            ) => {
                ctx.stream.write(
                    BuiltInMethodTemplate.array.print.impl(
                        orbTypeToCType(shapeType.element),
                        shapeKey
                    ) + '\n\n'
                );
            },
        },
    },
};
