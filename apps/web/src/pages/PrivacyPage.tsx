import { useDocumentMeta } from '../lib/useDocumentMeta.js';

const EFFECTIVE_DATE = 'July 19, 2026';

export function PrivacyPage() {
  useDocumentMeta(
    'Privacy Policy | badthingsforpets.com',
    'What badthingsforpets.com collects, why, and who it shares it with.',
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-neutral-700">
      <h1 className="text-3xl font-extrabold text-neutral-800">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-400">Effective {EFFECTIVE_DATE}</p>

      <p className="mt-6">
        badthingsforpets.com is operated by GenomeInc ("we," "us"). This page describes what we
        collect through the site, why, and who we share it with. Searching and browsing the database
        doesn't require an account or collect anything beyond standard web server activity.
        Everything below applies once you sign in to contribute.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">What we collect</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong>If you sign in with GitHub or Google:</strong> your display name, email address,
          profile photo, and (GitHub only) your account's public creation date — used to confirm a
          real, established account is behind a contribution.
        </li>
        <li>
          <strong>If you sign in with a work email instead:</strong> the email address itself and a
          one-time verification code (the code is hashed before storage and expires after 15 minutes
          — we never keep it in plain text).
        </li>
        <li>
          <strong>If you request organizational (vet/scientist) verification:</strong> the domain of
          your work email. To help a human reviewer assess it, we fetch that domain's own public
          homepage, run a web search on the domain name, and send both to an AI model (Amazon
          Bedrock) for a best-guess classification of what kind of organization it is. This is a
          signal for the reviewer, not an automated approval or rejection.
        </li>
        <li>
          <strong>If you submit or edit an entry:</strong> the content you submit, and which account
          submitted it, so it can be reviewed and attributed.
        </li>
        <li>
          <strong>A session cookie</strong> once you're signed in — httpOnly, used only to keep you
          signed in, expires after 30 days or when you sign out.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">What we don't do</h2>
      <p className="mt-3">
        No advertising or marketing cookies, no analytics trackers, no selling or renting personal
        data to anyone, and no marketing email — the only email we send is verification codes.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Who we share it with</h2>
      <p className="mt-3">
        We don't sell or rent your data. It passes through the service providers that make the site
        work: GitHub or Google (if you use their sign-in), Amazon Web Services (hosting, database,
        and the Bedrock model used for organization classification), Amazon SES (sending
        verification code emails), and the Brave Search API (the web-search signal described above).
        Each only sees what's needed to do its job.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">How long we keep it</h2>
      <p className="mt-3">
        Account and contribution records are kept as long as your account exists. Verification codes
        expire in 15 minutes regardless of use. To request deletion of your account or data, email{' '}
        <a href="mailto:john@badthingsforpets.com" className="text-paw-600 underline">
          john@badthingsforpets.com
        </a>
        .
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Children's privacy</h2>
      <p className="mt-3">
        This site isn't directed at children, and we don't knowingly collect information from anyone
        under 13.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Changes to this policy</h2>
      <p className="mt-3">
        If this policy changes, we'll update the effective date above. Continued use of the site
        after a change means you accept the update.
      </p>

      <h2 className="mt-8 text-xl font-bold text-neutral-800">Contact</h2>
      <p className="mt-3">
        Questions about this policy:{' '}
        <a href="mailto:john@badthingsforpets.com" className="text-paw-600 underline">
          john@badthingsforpets.com
        </a>
        .
      </p>
    </div>
  );
}
