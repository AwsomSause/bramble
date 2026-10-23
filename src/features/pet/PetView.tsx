import { type Mood } from './pet-logic';

const FACE: Record<Mood, string> = { happy: 'ᵔ◡ᵔ', ok: '·◡·', sad: '╥_╥', sick: '×_×' };

/** The pet itself: the owner's image (or a default berry creature) with a mood face and a gentle idle wobble. */
export function PetView({ imageDataUrl, mood, name, asleep }: { imageDataUrl?: string; mood: Mood; name: string; asleep?: boolean }) {
  return (
    <div className="petStage" data-mood={mood}>
      <div className="petBody" aria-hidden="true">
        {imageDataUrl ? (
          <img src={imageDataUrl} alt="" className="petImg" />
        ) : (
          <svg viewBox="0 0 120 120" className="petImg">
            <defs>
              <radialGradient id="berryPet" cx="38%" cy="30%" r="70%">
                <stop offset="0" stopColor="#d9a6ef" />
                <stop offset="0.45" stopColor="#6b2d8b" />
                <stop offset="1" stopColor="#3b1d4f" />
              </radialGradient>
            </defs>
            <path d="M60 18c8-10 24-10 32-4-10 2-22 4-32 4z" fill="#4f8a2b" />
            {[
              [44, 44], [60, 40], [76, 44], [38, 60], [54, 58], [70, 58], [86, 60], [48, 76], [64, 74], [80, 76], [60, 92],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="13" fill="url(#berryPet)" stroke="#2a1238" strokeWidth="1" />
            ))}
          </svg>
        )}
        <span className="petFace">{asleep ? '-᷄‿-᷅' : FACE[mood]}</span>
      </div>
      <p className="petName" data-testid="pet-name">
        {name} {asleep && <span className="zzz">💤</span>}
      </p>
    </div>
  );
}
