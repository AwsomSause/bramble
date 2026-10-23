# Bramble Buddy (virtual pet)

A Tamagotchi-style pet, reached from the **Pet** tab. It's a first-party page (not a game in an iframe), so it can safely remember your pet and image in this browser.

## How it works

- **Adopt** a buddy with a name and, optionally, your own picture. The picture is resized and kept **only in this browser** — it is never uploaded.
- Four needs — **hunger, happiness, energy, cleanliness** — drift down over real time. **Feed**, **Play**, **Clean** and **Sleep** top them up. The pet's face shows its mood.
- You can keep **several pets** and switch between them from the shelf.
- **Stakes:** if a buddy is left with no care for about **3 days**, it's gone, and you see a short memorial and can adopt a new one. (This was a deliberate choice — it can be softened later if you'd rather pets just get sad.)

Everything is per-browser: your pets don't sync between devices, and clearing site data (or Settings → Clear my data) removes them.

## Where the code lives

- `src/features/pet/pet-logic.ts` — the pure rules (decay, care, death, mood, age). Fully unit-tested.
- `src/features/pet/petStore.ts` — the shelf of pets in `localStorage`.
- `src/features/pet/image.ts` — resizes an imported picture to a small PNG.
- `src/features/pet/PetPage.tsx`, `PetView.tsx`, `Pet.module.css` — the page.

To change the difficulty, edit the constants at the top of `pet-logic.ts` (`DEATH_MS` and `DECAY_PER_HOUR`).
