import type { BreedTrait } from './breed.js';

export type Severity = 'mild' | 'moderate' | 'severe' | 'unknown';

export interface PetToxicity {
  petTypeId: string;
  severity: Severity;
  /** Omitted = applies to the whole species. Set to scope risk to breeds sharing a physical trait (e.g. `long-backed` for stairs). */
  breedTraits?: BreedTrait[];
}

export interface Thing {
  id: string;
  name: string;
  otherNames: string[];
  thingTypeId: string;
  petTypes: PetToxicity[];
  /** Unstructured facts: toxic principles, clinical signs, dose notes, family, etc. */
  details: Record<string, unknown>;
  source: string;
  sourceUrl?: string;
  verified: boolean;
  contributorId?: string;
  createdAt: string;
  updatedAt: string;
}
