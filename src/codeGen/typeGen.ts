import type { Program, StructDecl } from '../parser/nodeTypes';
import { arrayTemplate, nullableTemplate, tupleTemplate } from './constants';
import type { CodeGenContext } from './context';
import { generateVariableDeclStream } from './handlers/variableDecl';
import { orbTypeToCType } from './helper';
import type { ShapeInfo } from './shapeCollector';
import fs from 'node:fs';

export function typeGen(
    shapeInfoArray: ShapeInfo[],
    ctx: CodeGenContext,
    ast: Program
) {
    for (const shape of shapeInfoArray) {
        let emitString: string | null = null;
        switch (shape.type.kind) {
            case 'array':
                emitString = arrayTemplate(
                    shape.key,
                    orbTypeToCType(shape.type.element)
                );
                break;
            case 'tuple':
                emitString = tupleTemplate(
                    shape.key,
                    shape.type.elements.map(orbTypeToCType)
                );
                break;
            case 'struct':
                const structNode = ast.declarations.find(
                    (d) =>
                        d.type === 'StructDecl' &&
                        shape.type.kind === 'struct' &&
                        d.name === shape.type.name
                ) as StructDecl;

                if (!structNode) {
                    throw new Error('Struct node not found');
                }

                ctx.stream.write(`typedef struct ${shape.key} {\n`);

                structNode.members.forEach((member) => {
                    ctx.stream.write('    ');
                    if (member.type === 'VariableDecl') {
                        generateVariableDeclStream(member, ctx);
                    }
                });
                ctx.stream.write(`} ${shape.key};\n`);

                structNode.members.forEach((member) => {
                    if (member.type === 'FunctionDecl') {
                        ctx.generate(member, ctx);
                    }
                });
                break;
            case 'nullable':
                emitString = nullableTemplate(orbTypeToCType(shape.type.inner));
                break;
            case 'map':
                throw new Error('Map type not supported yet');

            default:
                throw new Error('Unknown type');
        }
        if (emitString) ctx.stream.write(emitString);
    }
}
