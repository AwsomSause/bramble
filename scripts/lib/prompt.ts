/** Decides what a prompt answer means: the typed text, the default, or (null) "ask again". */
export function resolveAnswer(answer: string, fallback: string | undefined): string | null {
  if (answer) return answer;
  if (fallback !== undefined) return fallback;
  return null;
}
