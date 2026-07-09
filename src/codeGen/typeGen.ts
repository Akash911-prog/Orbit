import type { OrbType } from '../types';

export function genNullable(type: OrbType) {
    if (type.kind === 'nullable') return type.inner;
    return { kind: 'nullable', inner: type };
}
