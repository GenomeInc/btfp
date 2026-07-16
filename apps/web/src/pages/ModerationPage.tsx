import { useEffect, useState } from 'react';
import type { User } from '@btfp/shared-types';
import { api } from '../lib/api.js';

interface PendingContribution {
  PK: string;
  SK: string;
  thingId?: string;
  contributorId: string;
  payload: { name?: string; thingTypeId?: string };
  createdAt: string;
}

function ContributionsSection() {
  const [items, setItems] = useState<PendingContribution[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .listPendingContributions()
      .then((data) => setItems(data as PendingContribution[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(item: PendingContribution) {
    const thingId = item.PK.replace('THING#', '');
    await fetch(`/api/contributions/${thingId}/${encodeURIComponent(item.SK)}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    load();
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-neutral-800">Pending contributions</h2>
      {loading ? (
        <p className="mt-4 text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-neutral-400">Nothing pending. 🎉</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.SK} className="rounded-cozy border border-paw-200 bg-white p-4">
              <p className="font-semibold text-neutral-800">{item.payload.name}</p>
              <p className="text-sm text-neutral-500 capitalize">{item.payload.thingTypeId}</p>
              <button
                onClick={() => approve(item)}
                className="mt-2 rounded-full bg-leaf-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-leaf-600"
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfessionalVerificationsSection() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .listPendingProfessionalVerifications()
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function review(user: User, approve: boolean) {
    const reason = approve ? undefined : (prompt('Rejection reason (optional):') ?? undefined);
    await api.reviewProfessionalVerification(user.id, approve, reason);
    load();
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-neutral-800">Pending organization verifications</h2>
      {loading ? (
        <p className="mt-4 text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-neutral-400">Nothing pending. 🎉</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((user) => (
            <li key={user.id} className="rounded-cozy border border-paw-200 bg-white p-4">
              <p className="font-semibold text-neutral-800">{user.displayName}</p>
              <p className="text-sm text-neutral-500">{user.professional?.domain}</p>
              {user.professional?.orgClassification && (
                <p className="mt-1 text-xs text-neutral-400">
                  Bedrock guess: {user.professional.orgClassification.replaceAll('_', ' ')} —{' '}
                  {user.professional.orgClassificationReasoning}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => review(user, true)}
                  className="rounded-full bg-leaf-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-leaf-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(user, false)}
                  className="rounded-full bg-alert-100 px-4 py-1.5 text-sm font-semibold text-alert-600 hover:bg-alert-100/80"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ModerationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-800">Moderation queue</h1>
      <div className="mt-6">
        <ContributionsSection />
        <ProfessionalVerificationsSection />
      </div>
    </div>
  );
}
