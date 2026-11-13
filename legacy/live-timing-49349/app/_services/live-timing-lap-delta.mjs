export function formatLastLapDelta(deltaSeconds) {
  if (typeof deltaSeconds !== "number" || !Number.isFinite(deltaSeconds)) return null;

  const hundredths = Math.round(deltaSeconds * 100);
  if (hundredths === 0) {
    return {
      kind: "same",
      label: "0.00",
      ariaLabel: "Temps identique au tour précédent",
    };
  }

  const magnitude = (Math.abs(hundredths) / 100).toFixed(2);
  const localizedMagnitude = magnitude.replace(".", ",");
  const kind = hundredths < 0 ? "gain" : "loss";
  return {
    kind,
    label: `${hundredths < 0 ? "-" : "+"}${magnitude}`,
    ariaLabel: `${kind === "gain" ? "Gain" : "Perte"} de ${localizedMagnitude} s par rapport au tour précédent`,
  };
}
