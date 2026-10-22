import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { siteConfig } from '../config';
import { Logo } from '../ui/Logo';
import { SearchBox } from '../ui/SearchBox';
import styles from './Layout.module.css';

const DEBOUNCE_MS = 150;

/** The header search: live-filters on /games, otherwise jumps to /games?q=… on submit. */
function HeaderSearch() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const onGames = pathname === '/games';
  const urlQ = onGames ? (params.get('q') ?? '') : '';
  const [text, setText] = useState(urlQ);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  const timer = useRef<number | undefined>(undefined);

  // When the URL changes from elsewhere (Clear filters, Back button), show it in the box.
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    setText(urlQ);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const apply = (value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  const onChange = (value: string) => {
    setText(value);
    if (!onGames) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => apply(value), DEBOUNCE_MS);
  };

  const onSubmit = (value: string) => {
    window.clearTimeout(timer.current);
    if (onGames) apply(value);
    else navigate(value.trim() ? `/games?q=${encodeURIComponent(value.trim())}` : '/games');
  };

  return <SearchBox value={text} onChange={onChange} onSubmit={onSubmit} />;
}

export function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);

  // Move focus to the page content after navigation so keyboard and screen-reader users land there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <Logo />
            <span className="visually-hidden"> home</span>
          </Link>
          <div className={styles.search}>
            <HeaderSearch />
          </div>
          <nav aria-label="Site" className={styles.util}>
            <Link to="/settings">Settings</Link>
            <Link to="/about">About</Link>
          </nav>
        </div>
      </header>
      <div className={styles.tabsWrap}>
        <nav aria-label="Main">
          <ul className={styles.tabs}>
            <li>
              <NavLink to="/" end className={styles.tab}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/games" className={styles.tab}>
                Games
              </NavLink>
            </li>
            <li>
              <NavLink to="/favorites" className={styles.tab}>
                Favorites
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <ul>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/about#credits">Credits</Link>
          </li>
          <li>
            <Link to="/about#privacy">Privacy</Link>
          </li>
          <li>
            <a href={`${siteConfig.repoUrl}/issues/new`} target="_blank" rel="noopener noreferrer">
              Report a problem
            </a>
          </li>
        </ul>
        <p>© {siteConfig.name} · {siteConfig.tagline}</p>
      </footer>
    </>
  );
}
