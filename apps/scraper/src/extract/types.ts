import type { Severity } from '@btfp/shared-types';

export interface Taxonomy {
  thingTypeIds: string[];
  petTypeIds: string[];
}

export interface ExtractionResult {
  isPetHazardReport: boolean;
  thingName?: string;
  thingTypeId?: string;
  petTypeId?: string;
  severity?: Severity;
  summary?: string;
}
