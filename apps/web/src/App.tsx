import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav.js';
import { Footer } from './components/Footer.js';
import { AddFab } from './components/AddFab.js';
import { HomePage } from './pages/HomePage.js';
import { ThingDetailPage } from './pages/ThingDetailPage.js';
import { SubmitPage } from './pages/SubmitPage.js';
import { ModerationPage } from './pages/ModerationPage.js';
import { LlmInfoPage } from './pages/LlmInfoPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { TermsPage } from './pages/TermsPage.js';
import { useJsonLd } from './lib/useJsonLd.js';
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from './lib/site.js';

// Site-wide, not per-route: schema.org's WebSite type describes the site as
// a whole, so this stays constant regardless of which page injected it. The
// SearchAction target below is a real, functional URL — HomePage.tsx reads
// `q` from useSearchParams and drives its search off it — not aspirational
// markup.
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_ORIGIN,
  description: SITE_DESCRIPTION,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_ORIGIN}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export function App() {
  useJsonLd('website', WEBSITE_SCHEMA);

  return (
    <div className="flex min-h-screen flex-col bg-paw-50/40">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* :slug is cosmetic only — ThingDetailPage looks up strictly by
              :id, so a missing/stale/wrong slug still resolves correctly. */}
          <Route path="/things/:id/:slug?" element={<ThingDetailPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/things/:id/edit" element={<SubmitPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/llm-info" element={<LlmInfoPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Routes>
      </main>
      <Footer />
      <AddFab />
    </div>
  );
}
