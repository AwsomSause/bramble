/** Small hand-drawn icon set (original). Decorative: always aria-hidden. */
const paths = {
  star: 'M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z',
  expand: 'M2 2h6v2H4v4H2zm10 0h6v6h-2V4h-4zM2 12h2v4h4v2H2zm14 0h2v6h-6v-2h4z',
  reload: 'M10 3a7 7 0 1 0 6.6 9.3l-1.9-.6A5 5 0 1 1 10 5c1.4 0 2.6.6 3.5 1.5L11 9h7V2l-2.5 2.5A7 7 0 0 0 10 3z',
  flag: 'M4 2h2v16H4zm3 1h10l-2.5 4L17 11H7z',
  back: 'M9 3L2 10l7 7v-4.5h9v-5H9z',
  dice: 'M3 3h14v14H3zm3 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM10 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-4 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" style={{ display: 'inline-block' }}>
      <path d={paths[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
