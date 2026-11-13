export function isFullCourseYellow(flags) {
  if (!Array.isArray(flags)) return false;
  if (flags.some((flag) => flag?.type === "yellow" && flag.sector === 0)) return true;

  const yellowSectors = new Set(
    flags
      .filter((flag) => flag?.type === "yellow" && Number.isInteger(flag.sector) && flag.sector >= 1 && flag.sector <= 3)
      .map((flag) => flag.sector),
  );
  return yellowSectors.size === 3;
}
