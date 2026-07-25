import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Thing } from '@btfp/shared-types';
import { slugify } from '@btfp/shared-types';
import { api } from '../lib/api.js';
import { SeverityBadge } from '../components/SeverityBadge.js';
import { SEVERITY_GUIDANCE } from '../lib/severity.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import { useJsonLd } from '../lib/useJsonLd.js';
import { SITE_NAME, SITE_ORIGIN } from '../lib/site.js';

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

  const petSummary = thing?.petTypes.map((p) => `${p.petTypeId} (${p.severity})`).join(', ') ?? '';
  const headline = thing ? `${thing.name} — is it dangerous for pets?` : null;
  const description = thing
    ? `${thing.name} (${thing.thingTypeId}): toxicity for ${petSummary}.` +
      (thing.otherNames.length > 0
        ? ` Also known as ${thing.otherNames.slice(0, 3).join(', ')}.`
        : '') +
      ` Source: ${thing.source}.`
    : null;

  useDocumentMeta(
    headline ? `${headline} | badthingsforpets.com` : 'badthingsforpets.com',
    description ??
      'A searchable database of foods, plants, medications, and products that are dangerous for pets.',
  );

  useJsonLd(
    'article',
    thing && headline && description
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline,
          description,
          datePublished: thing.createdAt,
          dateModified: thing.updatedAt,
          author: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_ORIGIN}/things/${thing.id}/${slugify(thing.name)}`,
          },
        }
      : null,
  );

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

      <div className="mt-4 space-y-2">
        {thing.petTypes.map((p) => (
          <div key={p.petTypeId} className="rounded-cozy border border-paw-100 bg-paw-50 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 capitalize">
              {p.petTypeId} <SeverityBadge severity={p.severity} />
            </div>
            <p className="mt-1 text-sm text-neutral-600">{SEVERITY_GUIDANCE[p.severity]}</p>
          </div>
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
        <Link to={`/things/${thing.id}/edit`} className="text-paw-600 hover:underline">
          Notice something missing or wrong? Suggest an edit →
        </Link>
      </p>

      <p className="mt-2 text-sm text-neutral-400">
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
