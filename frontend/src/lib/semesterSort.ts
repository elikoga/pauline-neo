// Semester name format: "Sommer YYYY" or "Winter YYYY/YY"
// Examples: "Sommer 2026", "Winter 2024/25", "Winter 2025/26"

type SemesterInfo = {
  type: 'Sommer' | 'Winter';
  year: number; // Start year
  original: string;
};

const parseSemester = (name: string): SemesterInfo | null => {
  const sommerMatch = name.match(/^Sommer (\d{4})$/);
  if (sommerMatch) {
    return { type: 'Sommer', year: parseInt(sommerMatch[1]), original: name };
  }

  const winterMatch = name.match(/^Winter (\d{4})\/\d{2}$/);
  if (winterMatch) {
    return { type: 'Winter', year: parseInt(winterMatch[1]), original: name };
  }

  return null;
};

// For chronological sorting (newest first):
// - Sommer YYYY comes after Winter YYYY-1/YY (Summer comes after Winter of same academic year)
// - Winter YYYY/YY comes before Sommer YYYY+1
// Sort key: (year * 2) + offset, where Sommer=0, Winter=1
// This makes Winter 2025/26 = 2025*2+1 = 4051, Sommer 2026 = 2026*2+0 = 4052

export const compareSemesterNames = (a: string, b: string): number => {
  const infoA = parseSemester(a);
  const infoB = parseSemester(b);

  // If parsing fails, fall back to string comparison
  if (!infoA || !infoB) return a.localeCompare(b);

  const keyA = infoA.year * 2 + (infoA.type === 'Winter' ? 1 : 0);
  const keyB = infoB.year * 2 + (infoB.type === 'Winter' ? 1 : 0);

  // Newest first: descending order
  return keyB - keyA;
};

export const sortTimetablesBySemester = <T extends { semesterName: string }>(
  items: T[]
): T[] => {
  return [...items].sort((a, b) => compareSemesterNames(a.semesterName, b.semesterName));
};
