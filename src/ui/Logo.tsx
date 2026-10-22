/**
 * The Bramble wordmark: a glossy, puffy 2008-style logotype next to a blackberry
 * with a leaf. Original artwork drawn in SVG.
 */
export function Logo({ height = 44 }: { height?: number }) {
  const drupelets: [number, number][] = [
    [20, 20], [30, 18], [40, 22], [16, 30], [26, 29], [36, 31], [45, 32], [21, 39], [31, 39], [41, 41], [27, 48], [37, 49],
  ];
  return (
    <svg height={height} viewBox="0 0 230 62" role="img" aria-labelledby="bramble-logo-title">
      <title id="bramble-logo-title">Bramble</title>
      <defs>
        <radialGradient id="bl-berry" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#d9a6ef" />
          <stop offset="0.35" stopColor="#6b2d8b" />
          <stop offset="1" stopColor="#2a1238" />
        </radialGradient>
        <linearGradient id="bl-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a4cc0" />
          <stop offset="0.55" stopColor="#6b2d8b" />
          <stop offset="1" stopColor="#3b1d4f" />
        </linearGradient>
        <linearGradient id="bl-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M30 13 C 36 2, 50 1, 56 6 C 48 7, 40 10, 30 13 Z" fill="#4f8a2b" />
      <path d="M30 13 C 33 8, 38 5, 44 5" stroke="#2f5d17" strokeWidth="1.2" fill="none" />
      {drupelets.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6.2" fill="url(#bl-berry)" stroke="#2a1238" strokeWidth="0.6" />
      ))}
      {drupelets.map(([x, y], i) => (
        <circle key={`h${i}`} cx={x - 2} cy={y - 2.2} r="1.4" fill="#fff" opacity="0.7" />
      ))}
      <g fontFamily="'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif" fontWeight="bold" fontSize="40">
        <text x="60" y="45" fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round">Bramble</text>
        <text x="60" y="45" fill="url(#bl-text)" stroke="#2a1238" strokeWidth="1">Bramble</text>
        <text x="60" y="45" fill="url(#bl-gloss)" clipPath="inset(0 0 55% 0)">Bramble</text>
      </g>
    </svg>
  );
}
