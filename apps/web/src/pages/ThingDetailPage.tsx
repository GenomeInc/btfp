import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Thing } from '@btfp/shared-types';
import { api } from '../lib/api.js';
import { SeverityBadge } from '../components/SeverityBadge.js';

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '—');
}

export function ThingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [thing, setThing] = useState<Thing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getThing(id)
      .then(setThing)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-alert-600">{error}</div>;
  if (!thing) return <div className="mx-auto max-w-3xl px-4 py-10 text-neutral-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm text-paw-600 hover:underline">
        ← Back to search
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold text-neutral-800">{thing.name}</h1>
      {thing.otherNames.length > 0 && (
        <p className="mt-1 text-neutral-500">Also known as: {thing.otherNames.join(', ')}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {thing.petTypes.map((p) => (
          <span
            key={p.petTypeId}
            className="flex items-center gap-1 rounded-full bg-paw-50 px-3 py-1 text-sm capitalize"
          >
            {p.petTypeId} <SeverityBadge severity={p.severity} />
          </span>
        ))}
      </div>

      <dl className="mt-8 space-y-4">
        {Object.entries(thing.details)
          .filter(([key]) => key !== 'verifiedOrgDomain')
          .map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                {humanize(key)}
              </dt>
              <dd className="text-neutral-700">{formatValue(value)}</dd>
            </div>
          ))}
      </dl>

      {typeof thing.details.verifiedOrgDomain === 'string' && (
        <p className="mt-6 flex items-center gap-1 text-sm font-semibold text-leaf-600">
          ✓ Reviewed contribution from a verified organization ({thing.details.verifiedOrgDomain})
        </p>
      )}

      <p className="mt-8 text-sm text-neutral-400">
        Source: {thing.source}
        {thing.sourceUrl && (
          <>
            {' '}
            &middot;{' '}
            <a href={thing.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              view original
            </a>
          </>
        )}
      </p>
    </div>
  );
}
