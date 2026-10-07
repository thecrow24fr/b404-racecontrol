export function tyreGaugeVisual(remaining) {
  const percent = Math.max(0, Math.min(100, Number(remaining)));
  const innerTop = 12;
  const innerHeight = 196;
  const fillHeight = (percent / 100) * innerHeight;
  const fillY = innerTop + innerHeight - fillHeight;
  const labelY = 105;
  return {
    percent,
    fillHeight,
    fillY,
    textColor: fillY <= labelY ? "#06101d" : "#f8fafc",
  };
}
