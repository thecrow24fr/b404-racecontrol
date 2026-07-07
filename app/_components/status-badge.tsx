export type StatusType = "online" | "offline";

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
        status === "online"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-white/10 text-gray-400"
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === "online"
            ? "bg-emerald-400 animate-glow-pulse"
            : "bg-gray-500"
        }`}
      />
      {status === "online" ? "Online" : "Offline"}
    </span>
  );
}
