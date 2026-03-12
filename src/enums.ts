import type { DateChoice, ScreenshotType } from "./types";

export const SCREENSHOT_TYPES = [
  {
    label: "Garmin Sleep",
    value: "garmin_sleep",
  },
  {
    label: "HealthifyMe Macros",
    value: "healthifyme_macros",
  },
  {
    label: "HealthifyMe Food Log",
    value: "healthifyme_food_log",
  },
  {
    label: "Garmin Run",
    value: "garmin_run",
  },
  {
    label: "Garmin Daily Stats",
    value: "garmin_daily_stats",
  },
  {
    label: "Hevy Workout",
    value: "hevy_workout",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: ScreenshotType;
}>;

export const SCREENSHOT_TYPE_CHOICES = new Set<ScreenshotType>(
  SCREENSHOT_TYPES.map((type) => type.value),
);

export const DATE_CHOICES = new Set<DateChoice>([
  "date_today",
  "date_yesterday",
  "date_custom",
]);
