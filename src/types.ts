export type OrbType =
    | { kind: 'int'; copyable: boolean; iterable: boolean }
    | { kind: 'float'; copyable: boolean; iterable: boolean }
    | { kind: 'bool'; copyable: boolean; iterable: boolean }
    | { kind: 'str'; copyable: boolean; iterable: boolean }
    | { kind: 'String'; copyable: boolean; iterable: boolean }
    | { kind: 'char'; copyable: boolean; iterable: boolean }
    | { kind: 'byte'; copyable: boolean; iterable: boolean }
    | { kind: 'void'; copyable: boolean; iterable: boolean }
    | { kind: 'null'; copyable: boolean; iterable: boolean }
    | { kind: 'array'; element: OrbType; copyable: boolean; iterable: boolean }
    | {
          kind: 'map';
          key: OrbType;
          value: OrbType;
          copyable: boolean;
          iterable: boolean;
      }
    | {
          kind: 'tuple';
          elements: OrbType[];
          copyable: boolean;
          iterable: boolean;
      }
    | { kind: 'struct'; name: string; copyable: boolean; iterable: boolean }
    | { kind: 'generic'; name: string; copyable: boolean; iterable: boolean }
    | { kind: 'unknown'; copyable: boolean; iterable: boolean }
    | {
          kind: 'nullable';
          inner: OrbType;
          copyable: boolean;
          iterable: boolean;
      };

export const OrbTypes = {
    int: (): OrbType => ({ kind: 'int', copyable: true, iterable: false }),
    float: (): OrbType => ({ kind: 'float', copyable: true, iterable: false }),
    bool: (): OrbType => ({ kind: 'bool', copyable: true, iterable: false }),
    str: (): OrbType => ({ kind: 'str', copyable: true, iterable: false }),
    String: (): OrbType => ({
        kind: 'String',
        copyable: false,
        iterable: false,
    }),
    void: (): OrbType => ({ kind: 'void', copyable: true, iterable: false }),
    unknown: (): OrbType => ({
        kind: 'unknown',
        copyable: true,
        iterable: false,
    }),
    array: (element: OrbType): OrbType => ({
        kind: 'array',
        element,
        copyable: false,
        iterable: true,
    }),
    map: (key: OrbType, value: OrbType): OrbType => ({
        kind: 'map',
        key,
        value,
        copyable: false,
        iterable: true,
    }),
    tuple: (elements: OrbType[]): OrbType => ({
        kind: 'tuple',
        elements,
        copyable: false,
        iterable: true,
    }),
    struct: (name: string, copyable: boolean): OrbType => ({
        kind: 'struct',
        name,
        copyable,
        iterable: false,
    }),
    generic: (name: string): OrbType => ({
        kind: 'generic',
        name,
        copyable: false,
        iterable: false,
    }),
    char: (): OrbType => ({ kind: 'char', copyable: true, iterable: false }),
    byte: (): OrbType => ({ kind: 'byte', copyable: false, iterable: false }),
    nullable: (inner: OrbType, copyable: boolean): OrbType => ({
        kind: 'nullable',
        inner,
        copyable,
        iterable: false,
    }),
    null: (): OrbType => ({ kind: 'null', copyable: true, iterable: false }),
};
