import type { DateTime } from 'luxon';
import { fromISO } from './fromISOcache';

export const semesterStartDates: Map<string, DateTime> = new Map([
	['Sommer 2022', fromISO('2022-04-25T07:00')],
	['Winter 2022/23', fromISO('2022-10-17T07:00')],
	['Sommer 2023', fromISO('2023-04-17T07:00')],
	['Winter 2023/24', fromISO('2023-10-09T07:00')],
	['Sommer 2024', fromISO('2024-04-08T07:00')],
	['Winter 2024/25', fromISO('2024-10-14T07:00')],
	['Sommer 2025', fromISO('2025-04-07T07:00')],
	['Winter 2025/26', fromISO('2025-10-13T07:00')],
	['Sommer 2026', fromISO('2026-04-13T07:00')]
]);

const SEMESTER_WEEK_COUNT = 18;

export type WeekOption = {
	monday: DateTime;
	friday: DateTime;
	label: string;
	value: string;
};

export const getWeeksForSemester = (semesterName: string): WeekOption[] => {
	const start = semesterStartDates.get(semesterName);
	if (!start) return [];

	const weeks: WeekOption[] = [];
	for (let i = 0; i < SEMESTER_WEEK_COUNT; i++) {
		const monday = start.plus({ weeks: i });
		const friday = monday.plus({ days: 4 });
		weeks.push({
			monday,
			friday,
			label: `${monday.toLocaleString({ day: 'numeric', month: 'short' })} – ${friday.toLocaleString({ day: 'numeric', month: 'short' })}`,
			value: monday.toISODate()!
		});
	}
	return weeks;
};
