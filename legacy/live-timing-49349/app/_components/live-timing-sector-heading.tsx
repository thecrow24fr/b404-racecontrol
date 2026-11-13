import type { Flag } from "../_types/live-timing";

interface SectorHeadingProps {
  sector: 1 | 2 | 3;
  flags: Flag[];
}

/** Même source sectorielle que la carte, sans déduire un secteur d’un jaune général. */
export function SectorHeading({ sector, flags }: SectorHeadingProps) {
  const yellow = flags.some((flag) => flag.type === "yellow" && flag.sector === sector);
  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span>S{sector}</span>
      {yellow && (
        <span
          data-sector-yellow={sector}
          role="img"
          aria-label={`Drapeau jaune secteur ${sector}`}
          title={`Drapeau jaune secteur ${sector}`}
          className="inline-block h-2 w-2 shrink-0 rounded-[1px] bg-yellow-400"
        />
      )}
    </span>
  );
}
