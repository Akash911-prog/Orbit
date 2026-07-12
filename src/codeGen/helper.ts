import type { OrbType } from '../types';

export function isCompositeOrString(t: OrbType) {
    return (
        t.kind === 'array' ||
        t.kind === 'map' ||
        t.kind === 'tuple' ||
        t.kind === 'struct' ||
        t.kind === 'nullable'
    );
}

export function getShapeKey(t: OrbType): string {
    switch (t.kind) {
        case 'array':
            return `__orbit_array_${getShapeKey(t.element)}`;
        case 'struct':
            return `__orbit_struct_${t.name}`;
        case 'tuple':
            return `__orbit_tuple_${t.elements.map(getShapeKey).join('_')}`;
        case 'map':
            return `__orbit_map_${getShapeKey(t.key)}_${getShapeKey(t.value)}`;
        case 'nullable':
            return `__orbit_nullable_${getShapeKey(t.inner)}`;
        case 'int':
            return 'int32_t';
        default:
            return t.kind;
    }
}

export function directlyDependsOn(t: OrbType): OrbType[] {
    switch (t.kind) {
        case 'array':
            return [t.element];
        case 'struct':
            return [];
        case 'tuple':
            return t.elements;
        case 'map':
            return [t.key, t.value];
        case 'nullable':
            return [t.inner];
        default:
            return [];
    }
}

export function orbTypeToCType(type: OrbType): string {
    switch (type.kind) {
        case 'int':
            return 'int32_t';
        case 'float':
            return 'float';
        case 'String':
            return '__orbit_String';
        case 'str':
            return 'char *';
        case 'array':
            return getShapeKey(type);
        case 'map':
            return getShapeKey(type);
        case 'tuple':
            return getShapeKey(type);
        case 'struct':
            return getShapeKey(type);
        case 'nullable':
            return getShapeKey(type);
        default:
            return type.kind;
    }
}
