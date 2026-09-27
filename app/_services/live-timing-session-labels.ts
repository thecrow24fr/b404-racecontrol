/**
 * Normalise uniquement la présentation des libellés de session.
 * La valeur source (sessionCode/currentSession) reste inchangée.
 */
export function formatSessionDisplayLabel(
  value: string | null | undefined,
): string {
  const label = value?.trim();
  if (!label) return "—";
  return label.replace(/\s+\d+$/, "");
}
