export type OrbType =
    | { kind: 'int'; copyable: boolean }
    | { kind: 'float'; copyable: boolean }
    | { kind: 'bool'; copyable: boolean }
    | { kind: 'str'; copyable: boolean }
    | { kind: 'String'; copyable: boolean }
    | { kind: 'char'; copyable: boolean }
    | { kind: 'byte'; copyable: boolean }
    | { kind: 'void'; copyable: boolean }
    | { kind: 'null'; copyable: boolean }
    | { kind: 'array'; element: OrbType; copyable: boolean }
    | { kind: 'map'; key: OrbType; value: OrbType; copyable: boolean }
    | { kind: 'tuple'; elements: OrbType[]; copyable: boolean }
    | { kind: 'struct'; name: string; copyable: boolean }
    | { kind: 'generic'; name: string; copyable: boolean }
    | { kind: 'unknown'; copyable: boolean }
    | { kind: 'nullable'; inner: OrbType; copyable: boolean };

export const OrbTypes = {
    int: (): OrbType => ({ kind: 'int', copyable: true }),
    float: (): OrbType => ({ kind: 'float', copyable: true }),
    bool: (): OrbType => ({ kind: 'bool', copyable: true }),
    str: (): OrbType => ({ kind: 'str', copyable: true }),
    String: (): OrbType => ({ kind: 'String', copyable: false }),
    void: (): OrbType => ({ kind: 'void', copyable: true }),
    unknown: (): OrbType => ({ kind: 'unknown', copyable: true }),
    array: (element: OrbType): OrbType => ({
        kind: 'array',
        element,
        copyable: false,
    }),
    map: (key: OrbType, value: OrbType): OrbType => ({
        kind: 'map',
        key,
        value,
        copyable: false,
    }),
    tuple: (elements: OrbType[]): OrbType => ({
        kind: 'tuple',
        elements,
        copyable: false,
    }),
    struct: (name: string, copyable: boolean): OrbType => ({
        kind: 'struct',
        name,
        copyable,
    }),
    generic: (name: string): OrbType => ({
        kind: 'generic',
        name,
        copyable: false,
    }),
    char: (): OrbType => ({ kind: 'char', copyable: true }),
    byte: (): OrbType => ({ kind: 'byte', copyable: false }),
    nullable: (inner: OrbType): OrbType => ({
        kind: 'nullable',
        inner,
        copyable: false,
    }),
    null: (): OrbType => ({ kind: 'null', copyable: true }),
};
