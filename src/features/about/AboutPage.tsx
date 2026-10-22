import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { ErrorBox } from '../../app/ErrorBox';
import { usePageTitle } from '../../app/usePageTitle';
import { useCredits } from '../../catalog/load';
import { siteConfig } from '../../config';
import { Spinner } from '../../ui/Spinner';

const box = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 14px 10px', marginBottom: 14 };

function Ext({ href, children }: { href?: string; children: string }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

export default function AboutPage() {
  usePageTitle('About');
  const { status, credits, retry } = useCredits();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, status]);

  return (
    <>
      <h1 style={{ margin: '0 0 12px', fontSize: '1.6rem' }}>About {siteConfig.name}</h1>
      <section aria-labelledby="about-h" style={box}>
        <h2 id="about-h">About Bramble</h2>
        <p>
          {siteConfig.name} is a small, hand-picked patch of browser games for friends. Every game here is either made
          for Bramble or shared with permission from its creator.
        </p>
        <p>
          Something broken?{' '}
          <a href={`${siteConfig.repoUrl}/issues/new`} target="_blank" rel="noopener noreferrer">
            Report a problem
          </a>
          .
        </p>
      </section>
      <section id="credits" aria-labelledby="credits-h" style={box}>
        <h2 id="credits-h">Credits</h2>
        {status === 'loading' && <Spinner label="Loading credits…" />}
        {status === 'error' && <ErrorBox message="We couldn't load the credits list." onRetry={retry} />}
        {status === 'ready' && credits.length === 0 && <p>No games yet.</p>}
        {status === 'ready' && credits.length > 0 && (
          <ul>
            {credits.map((c) => (
              <li key={c.slug}>
                <strong>{c.title}</strong> by <Ext href={c.authorUrl}>{c.author}</Ext> — <Ext href={c.licenseUrl}>{c.license}</Ext>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section id="privacy" aria-labelledby="privacy-h" style={box}>
        <h2 id="privacy-h">Privacy</h2>
        <p>
          Bramble has no accounts, no analytics and no cookies. Your favorites, recently played games, scores and settings
          are stored only in this browser.
        </p>
        <p>
          Games run in a locked-down frame. Some games may be hosted by their creators on other websites; those sites have
          their own privacy policies.
        </p>
      </section>
    </>
  );
}
