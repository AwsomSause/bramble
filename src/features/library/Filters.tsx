import { Link } from 'react-router';
import { toSearchParams, type LibraryQuery, type SortKey } from '../../catalog/query';
import { CATEGORIES } from '../../catalog/schema';
import styles from './Library.module.css';

type Props = {
  query: LibraryQuery;
  tags: string[];
  collections: string[];
  onChange: (patch: Partial<LibraryQuery>) => void;
};

const href = (q: LibraryQuery) => {
  const s = toSearchParams(q).toString();
  return s ? `/games?${s}` : '/games';
};

export function Filters({ query, tags, collections, onChange }: Props) {
  return (
    <>
      <nav aria-label="Categories">
        <ul className={styles.cats}>
          {(['all', ...CATEGORIES] as const).map((c) => (
            <li key={c}>
              <Link to={href({ ...query, cat: c, page: 1 })} aria-current={query.cat === c ? 'page' : undefined}>
                {c === 'all' ? 'All' : c[0]!.toUpperCase() + c.slice(1)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.controls}>
        <label>
          Sort by
          <select value={query.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}>
            <option value="az">Title A–Z</option>
            <option value="za">Title Z–A</option>
            <option value="new">Newest</option>
          </select>
        </label>
        {tags.length > 0 && (
          <label>
            Tag
            <select value={query.tag ?? ''} onChange={(e) => onChange({ tag: e.target.value || null })}>
              <option value="">Any</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        {collections.length > 1 && (
          <label>
            Collection
            <select value={query.collection ?? ''} onChange={(e) => onChange({ collection: e.target.value || null })}>
              <option value="">All</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </>
  );
}
