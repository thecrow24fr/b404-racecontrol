export function preserveLastGoodSnapshot(data, sourceId, hasLastGoodSnapshot) {
  if (!hasLastGoodSnapshot || !data || data.sourceId !== sourceId) return null;
  return {
    ...data,
    server: {
      ...data.server,
      status: "degraded",
    },
  };
}
