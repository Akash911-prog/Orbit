export type OrbType =
    | { kind: 'int' }
    | { kind: 'float' }
    | { kind: 'bool' }
    | { kind: 'str' }
    | { kind: 'String' }
    | { kind: 'char' }
    | { kind: 'byte' }
    | { kind: 'void' }
    | { kind: 'array'; element: OrbType }
    | { kind: 'map'; key: OrbType; value: OrbType }
    | { kind: 'tuple'; elements: OrbType[] }
    | { kind: 'fn'; params: OrbType[]; returnType: OrbType }
    | { kind: 'struct'; name: string }
    | { kind: 'generic'; name: string }
    | { kind: 'unknown' };

export const OrbTypes = {
    int: (): OrbType => ({ kind: 'int' }),
    float: (): OrbType => ({ kind: 'float' }),
    bool: (): OrbType => ({ kind: 'bool' }),
    str: (): OrbType => ({ kind: 'str' }),
    void: (): OrbType => ({ kind: 'void' }),
    unknown: (): OrbType => ({ kind: 'unknown' }),
    array: (element: OrbType): OrbType => ({ kind: 'array', element }),
    map: (key: OrbType, value: OrbType): OrbType => ({
        kind: 'map',
        key,
        value,
    }),
    tuple: (elements: OrbType[]): OrbType => ({ kind: 'tuple', elements }),
    fn: (params: OrbType[], returnType: OrbType): OrbType => ({
        kind: 'fn',
        params,
        returnType,
    }),
    struct: (name: string): OrbType => ({ kind: 'struct', name }),
    generic: (name: string): OrbType => ({ kind: 'generic', name }),
};
