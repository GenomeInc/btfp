import { describe, expect, it } from 'vitest';
import { transformVetmedsToxins, type VetmedsToxinsDataset } from './transform.js';

describe('transformVetmedsToxins', () => {
  const raw: VetmedsToxinsDataset = {
    entries: [
      {
        name: 'Chocolate',
        thingTypeId: 'food',
        petTypes: [
          { petTypeId: 'dog', severity: 'moderate' },
          { petTypeId: 'cat', severity: 'moderate' },
        ],
        details: {
          category: 'Food',
          clinicalSigns: 'vomiting, diarrhea, panting, tremors, seizures.',
          toxicDoseSummary: 'In dogs, 250 mg/kg can be toxic.',
        },
        source: 'American College of Veterinary Pharmacists — Pet Poison Control',
        sourceUrl: 'https://vetmeds.org/pet-poison-control-list/chocolate/',
      },
    ],
  };

  it('produces a Thing with a stable id derived from thingTypeId + name', () => {
    const [thing] = transformVetmedsToxins(raw);

    expect(thing?.id).toMatch(/^[0-9a-f]{16}$/);
    expect(thing?.name).toBe('Chocolate');
    expect(thing?.thingTypeId).toBe('food');
  });

  it('is deterministic — the same input always produces the same id', () => {
    const [first] = transformVetmedsToxins(raw);
    const [second] = transformVetmedsToxins(raw);

    expect(first?.id).toBe(second?.id);
  });

  it('always marks entries verified, carries per-entry source/sourceUrl, and preserves petTypes', () => {
    const [thing] = transformVetmedsToxins(raw);

    expect(thing?.verified).toBe(true);
    expect(thing?.source).toBe('American College of Veterinary Pharmacists — Pet Poison Control');
    expect(thing?.sourceUrl).toBe('https://vetmeds.org/pet-poison-control-list/chocolate/');
    expect(thing?.petTypes).toEqual([
      { petTypeId: 'dog', severity: 'moderate' },
      { petTypeId: 'cat', severity: 'moderate' },
    ]);
  });

  it('carries clinicalSigns/toxicDoseSummary/category into details', () => {
    const [thing] = transformVetmedsToxins(raw);

    expect(thing?.details).toEqual({
      category: 'Food',
      clinicalSigns: 'vomiting, diarrhea, panting, tremors, seizures.',
      toxicDoseSummary: 'In dogs, 250 mg/kg can be toxic.',
    });
  });

  it('produces one Thing per entry', () => {
    const twoEntries: VetmedsToxinsDataset = {
      entries: [raw.entries[0]!, { ...raw.entries[0]!, name: 'Xylitol' }],
    };

    const things = transformVetmedsToxins(twoEntries);

    expect(things).toHaveLength(2);
    expect(things.map((t) => t.name)).toEqual(['Chocolate', 'Xylitol']);
    // Different names -> different stable ids, even with the same thingTypeId.
    expect(things[0]?.id).not.toBe(things[1]?.id);
  });
});
