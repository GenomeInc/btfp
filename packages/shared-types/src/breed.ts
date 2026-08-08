/**
 * A closed, curated vocabulary — not free text. Keeping this small is what
 * makes breed-aware advice tractable: a contributor tags one trait (e.g.
 * `long-backed`) instead of enumerating every affected breed by name.
 */
export type BreedTrait =
  | 'long-backed'
  | 'brachycephalic'
  | 'giant-breed'
  | 'toy-breed'
  | 'deep-chested';

export interface Breed {
  id: string;
  name: string;
  petTypeId: string;
  traits: BreedTrait[];
  createdAt: string;
  updatedAt: string;
}
