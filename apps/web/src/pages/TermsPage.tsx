import { useDocumentMeta } from '../lib/useDocumentMeta.js';

const EFFECTIVE_DATE = 'July 19, 2026';

export function TermsPage() {
  useDocumentMeta(
    'Terms of Service | badthingsforpets.com',
    'The terms for using badthingsforpets.com and contributing to it.',
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-neutral-700">
      <h1 className="text-3xl font-extrabold text-neutral-800">Terms of Service</h1>
      <p className="mt-2 text-sm text-neutral-400">Effective {EFFECTIVE_DATE}</p>

      <p className="mt-6 rounded-cozy border border-alert-100 bg-alert-50 p-4 font-semibold text-alert-600">
        badthingsforpets.com is not a substitute for veterinary care. If you suspect your pet has
        been poisoned or injured, contact a veterinarian or animal poison control immediately —
        don't wait on this site.
      </p>

      <p className="mt-6">
        These terms govern your use of badthingsforpets.com, operated by GenomeInc ("we," "us"). By
        using the site you agree to them. If you don't agree, please don't use the site.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">The service</h2>
      <p className="mt-3">
        badthingsforpets.com is a community-contributed, moderated reference database of foods,
        plants, medications, objects, and activities that can be dangerous to pets. Entries are
        compiled from cited sources and community contributions, reviewed before publishing.
        Coverage is partial and growing — the absence of an entry is not evidence that something is
        safe. Nothing on this site is professional veterinary or medical advice, and it isn't a
        substitute for consulting a veterinarian about your specific pet.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Accounts</h2>
      <p className="mt-3">
        Contributing requires signing in via GitHub, Google, or a verified work email. You're
        responsible for activity under your account and for keeping the information you provide
        accurate.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Contributions</h2>
      <p className="mt-3">
        By submitting or editing an entry, you confirm you have the right to share it and grant us a
        license to publish, edit, and distribute it as part of the site. We review submissions
        before they go live and may edit, reject, or remove any contribution at our discretion,
        including after publication. We don't guarantee the accuracy of any entry, contributed or
        otherwise — always verify anything urgent with a veterinarian or a source like the ASPCA
        Animal Poison Control Center or Pet Poison Helpline.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Acceptable use</h2>
      <p className="mt-3">
        Don't submit false or malicious content, attempt to abuse or circumvent the sign-in or
        verification systems, or use the site in a way that disrupts it for others.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Third-party sources and links</h2>
      <p className="mt-3">
        Entries cite external sources and may link to them. We don't control those sites and aren't
        responsible for their content or availability.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">No warranty</h2>
      <p className="mt-3">
        The site is provided "as is," without warranties of any kind. We don't guarantee it will be
        uninterrupted, error-free, or that any entry is complete or accurate.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Limitation of liability</h2>
      <p className="mt-3">
        To the fullest extent permitted by law, GenomeInc isn't liable for any harm to you, your
        pet, or anyone else arising from reliance on information found on this site. Use it as a
        starting point, not a replacement for professional veterinary judgment.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Governing law</h2>
      <p className="mt-3">
        These terms are governed by the laws of the State of North Carolina, USA.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Changes to these terms</h2>
      <p className="mt-3">
        If these terms change, we'll update the effective date above. Continued use of the site
        after a change means you accept the update.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Contact</h2>
      <p className="mt-3">
        Questions about these terms:{' '}
        <a href="mailto:john@badthingsforpets.com" className="text-paw-600 underline">
          john@badthingsforpets.com
        </a>
        . See also our{' '}
        <a href="/privacy" className="text-paw-600 underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
