import { createHash } from 'node:crypto';
import type { PetToxicity, PetType, Severity, Thing, ThingType } from '@btfp/shared-types';

export interface RawDataset {
  metadata: {
    plant_source: string;
    food_medication_sources: string;
  };
  plants_toxic_to_dogs: RawPlant[];
  foods: RawFoodOrMedication[];
  medications: RawFoodOrMedication[];
}

interface RawPlant {
  name: string;
  other_common_names: string[];
  scientific_name: string;
  family: string | null;
  aspca_url: string;
  toxic_principles: string;
  clinical_signs: string;
  also_toxic_to: string[];
}

interface RawFoodOrMedication {
  name: string;
  severity: string;
  [key: string]: unknown;
}

// Dataset's also_toxic_to values are plural ("Cats", "Horses"); our PetType
// ids are singular to match the seeded PET_TYPES below.
const ALSO_TOXIC_TO_PET_TYPE_ID: Record<string, string> = {
  Cats: 'cat',
  Horses: 'horse',
};

function stableId(thingTypeId: string, name: string): string {
  return createHash('sha1').update(`${thingTypeId}:${name}`).digest('hex').slice(0, 16);
}

function normalizeSeverity(raw: string | undefined): Severity {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (lower.includes('severe') || lower.includes('lethal')) return 'severe';
  if (lower.includes('moderate')) return 'moderate';
  if (lower.includes('mild')) return 'mild';
  return 'unknown';
}

function stamp<T extends { createdAt: string; updatedAt: string }>(item: T): T {
  const now = new Date().toISOString();
  return { ...item, createdAt: now, updatedAt: now };
}

export const PET_TYPES: PetType[] = [
  { id: 'dog', name: 'Dog', aliases: [], details: {}, createdAt: '', updatedAt: '' },
  { id: 'cat', name: 'Cat', aliases: [], details: {}, createdAt: '', updatedAt: '' },
  { id: 'horse', name: 'Horse', aliases: [], details: {}, createdAt: '', updatedAt: '' },
].map(stamp);

export const THING_TYPES: ThingType[] = [
  {
    id: 'plant',
    name: 'Plant',
    description: 'Houseplants, garden plants, and flowers.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'food',
    name: 'Food',
    description: 'Human foods and drinks.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'medication',
    name: 'Medication',
    description: 'Human and veterinary medications.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Pet gear, household products, and other items.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'activity',
    name: 'Activity',
    description: 'Situations and activities that put pets at risk.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'object',
    name: 'Object',
    description: 'Non-food items pets swallow — choking and obstruction risk, not toxicity.',
    details: {},
    createdAt: '',
    updatedAt: '',
  },
].map(stamp);

export function transformDataset(raw: RawDataset): Thing[] {
  const things: Thing[] = [];

  for (const plant of raw.plants_toxic_to_dogs) {
    const petTypes: PetToxicity[] = [{ petTypeId: 'dog', severity: 'unknown' }];
    for (const other of plant.also_toxic_to ?? []) {
      const petTypeId = ALSO_TOXIC_TO_PET_TYPE_ID[other];
      if (petTypeId && !petTypes.some((p) => p.petTypeId === petTypeId)) {
        petTypes.push({ petTypeId, severity: 'unknown' });
      }
    }

    things.push(
      stamp({
        id: stableId('plant', plant.name),
        name: plant.name,
        otherNames: plant.other_common_names ?? [],
        thingTypeId: 'plant',
        petTypes,
        details: {
          scientificName: plant.scientific_name,
          family: plant.family,
          toxicPrinciples: plant.toxic_principles,
          clinicalSigns: plant.clinical_signs,
        },
        source: raw.metadata.plant_source,
        sourceUrl: plant.aspca_url,
        verified: true,
        createdAt: '',
        updatedAt: '',
      }),
    );
  }

  for (const food of raw.foods) {
    things.push(
      stamp({
        id: stableId('food', food.name),
        name: food.name,
        otherNames: [],
        thingTypeId: 'food',
        petTypes: [{ petTypeId: 'dog', severity: normalizeSeverity(food.severity) }],
        details: { rawSeverity: food.severity, ...food },
        source: raw.metadata.food_medication_sources,
        verified: true,
        createdAt: '',
        updatedAt: '',
      }),
    );
  }

  for (const medication of raw.medications) {
    things.push(
      stamp({
        id: stableId('medication', medication.name),
        name: medication.name,
        otherNames: [],
        thingTypeId: 'medication',
        petTypes: [{ petTypeId: 'dog', severity: normalizeSeverity(medication.severity) }],
        details: { rawSeverity: medication.severity, ...medication },
        source: raw.metadata.food_medication_sources,
        verified: true,
        createdAt: '',
        updatedAt: '',
      }),
    );
  }

  return things;
}

export interface CuratedHazardsDataset {
  metadata: {
    compiled_by: string;
  };
  entries: CuratedHazardEntry[];
}

interface CuratedHazardEntry {
  name: string;
  thingType: 'product' | 'activity' | 'object';
  petTypes: string[];
  severity: Severity;
  hazard: string;
  notes?: string;
  source: string;
  sourceUrl: string;
}

export function transformCuratedHazards(raw: CuratedHazardsDataset): Thing[] {
  return raw.entries.map((entry) =>
    stamp({
      id: stableId(entry.thingType, entry.name),
      name: entry.name,
      otherNames: [],
      thingTypeId: entry.thingType,
      petTypes: entry.petTypes.map((petTypeId) => ({ petTypeId, severity: entry.severity })),
      details: { hazard: entry.hazard, notes: entry.notes },
      source: entry.source,
      sourceUrl: entry.sourceUrl,
      verified: true,
      createdAt: '',
      updatedAt: '',
    }),
  );
}
