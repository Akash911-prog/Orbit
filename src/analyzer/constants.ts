import { OrbTypes, type OrbType } from '../types';

export const BUILT_IN_TYPE_PROPERTIES: Partial<
    Record<string, Record<string, OrbType>>
> = {
    common: {
        length: OrbTypes.int(),
        capacity: OrbTypes.int(),
    },
};
