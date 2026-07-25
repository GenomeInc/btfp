import { Link, useLocation } from 'react-router-dom';

const HIDDEN_PREFIXES = ['/submit', '/moderation'];

export function AddFab() {
  const { pathname } = useLocation();
  const hidden =
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    /^\/things\/[^/]+\/edit$/.test(pathname);

  if (hidden) return null;

  return (
    <Link
      to="/submit"
      aria-label="Add a dangerous thing"
      className="fixed right-5 bottom-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-paw-500 text-2xl font-bold text-white shadow-lg transition hover:bg-paw-600 sm:hidden"
    >
      +
    </Link>
  );
}
