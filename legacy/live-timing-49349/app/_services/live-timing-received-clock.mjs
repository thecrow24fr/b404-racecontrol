const parisClockFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "shortOffset",
});

function formatInstant(timestamp) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return { utc: "—", paris: "—", iso: "" };
  }

  const date = new Date(timestamp);
  const parts = parisClockFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const parisTime = `${values.hour}:${values.minute}:${values.second}`;

  return {
    utc: date.toISOString().slice(11, 19),
    paris: `${parisTime} Paris (${values.timeZoneName})`,
    iso: date.toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
}

/** Format the exact browser receipt instant for the last accepted snapshot. */
export function formatReceivedTimes(receivedAt) {
  const times = formatInstant(receivedAt);
  return { ...times, utc: times.utc === "—" ? "—" : `${times.utc} UTC` };
}

/** Format the current browser wall-clock instant, separate from snapshot receipt. */
export function formatCurrentTimes(currentAt) {
  return formatInstant(currentAt);
}
