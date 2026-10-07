export function tyreConsumedThisLap(history, selected) {
  const index = history.findIndex((row) => row.relay === selected.relay && row.lap === selected.lap);
  const previous = index > 0 ? history[index - 1] : null;
  if (!previous || previous.relay !== selected.relay) return [null, null, null, null];
  return [
    previous.wearFrontLeft - selected.wearFrontLeft,
    previous.wearFrontRight - selected.wearFrontRight,
    previous.wearRearLeft - selected.wearRearLeft,
    previous.wearRearRight - selected.wearRearRight,
  ].map((value) => Number.isFinite(value) && value >= 0 ? Math.round(value * 10) / 10 : null);
}
