import { globalTable } from '../globals';
import type { Expression, Program, StructDecl } from '../parser/nodeTypes';
import type { StructEntry } from '../symbolTable/symbolTable';
import { arrayTemplate, nullableTemplate, tupleTemplate } from './constants';
import { generateVariableDeclStream } from './handlers/variableDecl';
import { orbTypeToCType } from './helper';
import type { ShapeInfo } from './shapeCollector';
import fs from 'node:fs';

export function typeGen(
    shapeInfoArray: ShapeInfo[],
    stream: fs.WriteStream,
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

                stream.write(`typedef struct ${shape.key} {\n`);

                structNode.members.forEach((member) => {
                    stream.write('    ');
                    if (member.type === 'VariableDecl') {
                        generateVariableDeclStream(member, stream);
                    }
                });
                stream.write(`} ${shape.key};\n`);
                break;
            case 'nullable':
                emitString = nullableTemplate(orbTypeToCType(shape.type.inner));
                break;
            case 'map':
                throw new Error('Map type not supported yet');

            default:
                throw new Error('Unknown type');
        }
        if (emitString) stream.write(emitString);
    }
}
