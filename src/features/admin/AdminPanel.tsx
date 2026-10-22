import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { CATEGORIES, CONTROLS, gameSchema, type Control } from '../../catalog/schema';
import { siteConfig } from '../../config';
import { Button } from '../../ui/Button';
import { buildCommitFiles, publishToGitHub } from './github';
import { deleteDraft, getDrafts, saveDraft, useDrafts, type StoredDraft } from './drafts';
import { closeAdmin } from './useAdmin';
import styles from './Admin.module.css';

function slugify(title: string): string {
  const s = title
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'game';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function readFileAs(file: File, how: 'text' | 'dataURL'): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('could not read the file'));
    if (how === 'text') r.readAsText(file);
    else r.readAsDataURL(file);
  });
}

function download(name: string, content: string | Blob) {
  const url = typeof content === 'string' ? content : URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  if (typeof content !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const repoParts = (() => {
  try {
    const parts = new URL(siteConfig.repoUrl).pathname.split('/').filter(Boolean);
    return { owner: parts[0] ?? 'OWNER', repo: parts[1] ?? 'bramble' };
  } catch {
    return { owner: 'OWNER', repo: 'bramble' };
  }
})();

export function AdminPanel({ canPublish }: { canPublish: boolean }) {
  const drafts = useDrafts();
  const [kind, setKind] = useState<'link' | 'html'>('link');
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructions: '',
    category: 'casual' as (typeof CATEGORIES)[number],
    tags: '',
    link: '',
    author: '',
    permission: '',
    license: '',
    mobile: 'partial' as 'yes' | 'partial' | 'no',
    featured: false,
    controls: ['keyboard', 'mouse'] as Control[],
  });
  const [html, setHtml] = useState<string>();
  const [htmlName, setHtmlName] = useState('');
  const [thumb, setThumb] = useState<string>();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onHtml = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHtml(await readFileAs(file, 'text'));
    setHtmlName(file.name);
  };
  const onThumb = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setThumb(await readFileAs(file, 'dataURL'));
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    const slug = uniqueSlug(slugify(form.title || 'game'), new Set(getDrafts().map((d) => d.details.slug)));
    const source =
      kind === 'link' ? { type: 'embed' as const, url: form.link.trim() } : { type: 'file' as const, path: `games/${slug}/index.html` };
    if (kind === 'html' && html === undefined) {
      setError('Choose an HTML file, or switch to a link.');
      return;
    }
    const parsed = gameSchema.safeParse({
      slug,
      title: form.title,
      description: form.description,
      instructions: form.instructions || undefined,
      category: form.category,
      tags: form.tags.split(',').map((t) => slugify(t)).filter(Boolean).slice(0, 8),
      source,
      controls: form.controls.length ? form.controls : ['keyboard'],
      fullscreen: true,
      mobile: form.mobile,
      attribution: { author: form.author },
      license: { name: form.license || 'Used with permission', permission: form.permission },
      featured: form.featured,
      addedAt: new Date().toISOString().slice(0, 10),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(`${first?.path.join('.') || 'form'}: ${first?.message}`);
      return;
    }
    const draft: StoredDraft = { details: { ...parsed.data, embedBlocked: false }, html, thumbDataUrl: thumb };
    saveDraft(draft);
    setSaved(`Saved “${parsed.data.title}” as a draft. Play-test it below.`);
    setForm((f) => ({ ...f, title: '', description: '', instructions: '', link: '', tags: '' }));
    setHtml(undefined);
    setHtmlName('');
    setThumb(undefined);
  };

  return (
    <div>
      <h2>Add a game</h2>
      <p className={styles.softnote}>
        Games you add here are saved in <strong>this browser only</strong> as drafts, so you can play-test them. They go
        live only when you publish or commit them.
      </p>
      <form onSubmit={save} className={styles.form}>
        <label>
          Title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} required />
        </label>
        <label>
          How to play (optional)
          <input value={form.instructions} onChange={(e) => set('instructions', e.target.value)} />
        </label>
        <div className={styles.row}>
          <label>
            Category
            <select value={form.category} onChange={(e) => set('category', e.target.value as (typeof CATEGORIES)[number])}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Works on phones?
            <select value={form.mobile} onChange={(e) => set('mobile', e.target.value as 'yes' | 'partial' | 'no')}>
              <option value="yes">Yes</option>
              <option value="partial">Partly</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
        <label>
          Tags (comma separated, optional)
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </label>
        <fieldset className={styles.controls}>
          <legend>Controls</legend>
          {CONTROLS.map((c) => (
            <label key={c} className={styles.inline}>
              <input
                type="checkbox"
                checked={form.controls.includes(c)}
                onChange={(e) => set('controls', e.target.checked ? [...form.controls, c] : form.controls.filter((x) => x !== c))}
              />
              {c}
            </label>
          ))}
        </fieldset>
        <fieldset className={styles.controls}>
          <legend>Where is the game?</legend>
          <label className={styles.inline}>
            <input type="radio" checked={kind === 'link'} onChange={() => setKind('link')} /> A link
          </label>
          <label className={styles.inline}>
            <input type="radio" checked={kind === 'html'} onChange={() => setKind('html')} /> An HTML file
          </label>
        </fieldset>
        {kind === 'link' ? (
          <label>
            Game link (https://…)
            <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="https://games.example.com/my-game" />
          </label>
        ) : (
          <label>
            HTML file {htmlName && <span className={styles.ok}>({htmlName})</span>}
            <input type="file" accept=".html,text/html" onChange={onHtml} />
          </label>
        )}
        <label>
          Thumbnail image (optional) {thumb && <span className={styles.ok}>(selected)</span>}
          <input type="file" accept="image/*" onChange={onThumb} />
        </label>
        <div className={styles.row}>
          <label>
            Who made it?
            <input value={form.author} onChange={(e) => set('author', e.target.value)} required />
          </label>
          <label>
            Permission (where you got the right to use it)
            <input value={form.permission} onChange={(e) => set('permission', e.target.value)} required />
          </label>
        </div>
        <label className={styles.inline}>
          <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature on the
          home page
        </label>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {saved && <p className={styles.ok}>{saved}</p>}
        <Button type="submit" variant="primary">
          Save as draft
        </Button>
      </form>

      <DraftList drafts={drafts} canPublish={canPublish} />
    </div>
  );
}

function DraftList({ drafts, canPublish }: { drafts: StoredDraft[]; canPublish: boolean }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('bramble:admin:ghtoken') ?? localStorage.getItem('bramble:admin:ghtoken') ?? '');
  const [remember, setRemember] = useState(() => !!localStorage.getItem('bramble:admin:ghtoken'));
  const [status, setStatus] = useState<Record<string, string>>({});

  const rememberToken = (value: string, keep: boolean) => {
    setToken(value);
    try {
      sessionStorage.setItem('bramble:admin:ghtoken', value);
      if (keep) localStorage.setItem('bramble:admin:ghtoken', value);
      else localStorage.removeItem('bramble:admin:ghtoken');
    } catch {
      /* ignore */
    }
  };

  const publish = async (d: StoredDraft) => {
    setStatus((s) => ({ ...s, [d.details.slug]: 'Publishing…' }));
    try {
      const res = await publishToGitHub({
        ...repoParts,
        branch: 'main',
        token,
        message: `Add game: ${d.details.title}`,
        files: buildCommitFiles(d),
      });
      setStatus((s) => ({ ...s, [d.details.slug]: `Published ${res.committed.length} file(s). CI will deploy shortly.` }));
    } catch (e) {
      setStatus((s) => ({ ...s, [d.details.slug]: e instanceof Error ? e.message : 'Publish failed' }));
    }
  };

  const exportDraft = (d: StoredDraft) => {
    for (const f of buildCommitFiles(d)) {
      if (f.base64) download(f.path.split('/').pop()!, dataUrlFromBase64(f.base64, d.thumbDataUrl));
      else download(f.path.split('/').pop()!, new Blob([f.text ?? ''], { type: 'text/plain' }));
    }
  };

  return (
    <section aria-label="Your drafts" className={styles.drafts}>
      <h2>Your drafts</h2>
      {drafts.length === 0 ? (
        <p className={styles.softnote}>Nothing yet. Add a game above and it will show here to play-test.</p>
      ) : (
        <>
          {canPublish ? (
            <div className={styles.tokenBox}>
              <label>
                GitHub token (fine-grained, this repo, Contents: read &amp; write)
                <input type="password" value={token} onChange={(e) => rememberToken(e.target.value, remember)} placeholder="github_pat_…" />
              </label>
              <label className={styles.inline}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    rememberToken(token, e.target.checked);
                  }}
                />
                Remember on this device (less safe — stored in this browser)
              </label>
            </div>
          ) : (
            <p className={styles.softnote}>
              Publishing is turned off here for safety. To publish with one click, run Bramble locally
              (<code>npm run dev</code>) on your computer. You can still Export a draft&apos;s files below and commit them.
            </p>
          )}
          <ul className={styles.draftList}>
            {drafts.map((d) => (
              <li key={d.details.slug}>
                <span className={styles.draftTitle}>{d.details.title}</span>
                <span className={styles.draftActions}>
                  <Link to={`/play/${d.details.slug}`} onClick={closeAdmin}>
                    Play
                  </Link>
                  <button type="button" className={styles.linkBtn} onClick={() => exportDraft(d)}>
                    Export
                  </button>
                  {canPublish && (
                    <Button onClick={() => publish(d)} disabled={!token}>
                      Publish to GitHub
                    </Button>
                  )}
                  <button type="button" className={styles.linkBtn} onClick={() => deleteDraft(d.details.slug)}>
                    Delete
                  </button>
                </span>
                {status[d.details.slug] && (
                  <span role="status" className={styles.draftStatus}>
                    {status[d.details.slug]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function dataUrlFromBase64(base64: string, original?: string): string {
  return original ?? `data:application/octet-stream;base64,${base64}`;
}
