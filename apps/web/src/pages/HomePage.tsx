import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PetType, Thing } from '@btfp/shared-types';
import { api } from '../lib/api.js';
import { ThingCard } from '../components/ThingCard.js';
import { PetTypeSelect } from '../components/PetTypeSelect.js';

const RANDOM_SAMPLE_SIZE = 20;

function randomSample<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled.slice(0, count);
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const petType = params.get('petType') ?? '';

  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [things, setThings] = useState<Thing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listPetTypes()
      .then(setPetTypes)
      .catch(() => setPetTypes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listThings({ q: q || undefined, petType: petType || undefined })
      .then(setThings)
      .catch(() => setThings([]))
      .finally(() => setLoading(false));
  }, [q, petType]);

  // Idle browsing (no search, no pet filter) doesn't need to show the whole
  // ~450-entry database at once — a random taste of what's in here is
  // plenty, and leaves room for other homepage content later. An actual
  // search or pet-type filter is need-driven, so those still show every
  // real match.
  const isBrowsing = !q && !petType;
  const visibleThings = useMemo(
    () => (isBrowsing ? randomSample(things, RANDOM_SAMPLE_SIZE) : things),
    [things, isBrowsing],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold text-neutral-800">
          Is it safe for your <span className="text-paw-500">pet</span>? 🐶🐱🐴
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-500">
          Search foods, plants, medications, and more that could be dangerous for your pet.
        </p>

        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setParams((prev) => setParam(prev, 'q', e.target.value))}
            placeholder="Search e.g. chocolate, aloe, ibuprofen…"
            className="flex-1 rounded-full border border-paw-200 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-paw-400"
          />
          <PetTypeSelect
            petTypes={petTypes}
            value={petType}
            onChange={(value) => setParams((prev) => setParam(prev, 'petType', value))}
          />
        </div>
      </section>

      <section className="mt-10">
        {loading ? (
          <p className="text-center text-neutral-400">Fetching the facts…</p>
        ) : visibleThings.length === 0 ? (
          <p className="text-center text-neutral-400">Nothing found — try a different search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleThings.map((thing) => (
              <ThingCard key={thing.id} thing={thing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function setParam(prev: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}
