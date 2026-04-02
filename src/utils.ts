import { DATE_CHOICES, SCREENSHOT_TYPE_CHOICES } from "./enums";
import type { DateChoice, ScreenshotType } from "./types";
import type { CoachContext } from "./coachContext";

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

export function formatReadableDate(value: string): string {
  if (!/^\d{2}\d{2}\d{4}$/.test(value)) {
    throw new Error(`Expected date in ddmmyyyy format, received "${value}".`);
  }

  const day = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4)) - 1;
  const year = Number(value.slice(4, 8));
  const date = new Date(Date.UTC(year, month, day));

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isDateChoice(value: string): value is DateChoice {
  return DATE_CHOICES.has(value as DateChoice);
}

export function isScreenshotType(value: string): value is ScreenshotType {
  return SCREENSHOT_TYPE_CHOICES.has(value as ScreenshotType);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatLabel(value: string): string {
  return value
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatTableRows(entries: Array<[string, unknown]>): string {
  const labels = entries.map(([key]) => formatLabel(key));
  const width = labels.reduce((max, label) => Math.max(max, label.length), 0);

  return entries
    .map(([key, value], index) => {
      const label =
        labels[index]?.padEnd(width, " ") ||
        formatLabel(key).padEnd(width, " ");
      return `${escapeHtml(label)} | ${escapeHtml(formatScalar(value))}`;
    })
    .join("\n");
}

function formatObjectSection(
  title: string,
  value: Record<string, unknown>,
): string {
  const entries = Object.entries(value);
  const scalarEntries = entries.filter(
    ([, entryValue]) =>
      !isPlainObject(entryValue) && !Array.isArray(entryValue),
  );
  const nestedEntries = entries.filter(
    ([, entryValue]) => isPlainObject(entryValue) || Array.isArray(entryValue),
  );
  const sections: string[] = [`<b>${escapeHtml(formatLabel(title))}</b>`];

  if (scalarEntries.length > 0) {
    sections.push(`<pre>${formatTableRows(scalarEntries)}</pre>`);
  }

  for (const [nestedKey, nestedValue] of nestedEntries) {
    if (isPlainObject(nestedValue)) {
      sections.push(formatObjectSection(nestedKey, nestedValue));
      continue;
    }

    if (Array.isArray(nestedValue)) {
      sections.push(formatArraySection(nestedKey, nestedValue));
    }
  }

  return sections.join("\n");
}

function formatArraySection(title: string, values: unknown[]): string {
  const sections: string[] = [`<b>${escapeHtml(formatLabel(title))}</b>`];

  values.forEach((item, index) => {
    const itemTitle = `${formatLabel(title)} ${index + 1}`;

    if (isPlainObject(item)) {
      sections.push(formatObjectSection(itemTitle, item));
      return;
    }

    sections.push(
      `<pre>${escapeHtml(itemTitle)} | ${escapeHtml(formatScalar(item))}</pre>`,
    );
  });

  return sections.join("\n");
}

export function formatParsedScreenshot(result: string): string {
  const parsed = JSON.parse(result) as unknown;

  if (!isPlainObject(parsed)) {
    return `<pre>${escapeHtml(result)}</pre>`;
  }

  const entries = Object.entries(parsed);
  const scalarEntries = entries.filter(
    ([, value]) => !isPlainObject(value) && !Array.isArray(value),
  );
  const nestedEntries = entries.filter(
    ([, value]) => isPlainObject(value) || Array.isArray(value),
  );
  const sections = ["<b>Parsed Screenshot Data</b>"];

  if (scalarEntries.length > 0) {
    sections.push(`<pre>${formatTableRows(scalarEntries)}</pre>`);
  }

  for (const [key, value] of nestedEntries) {
    if (isPlainObject(value)) {
      sections.push(formatObjectSection(key, value));
      continue;
    }

    if (Array.isArray(value)) {
      sections.push(formatArraySection(key, value));
    }
  }

  return sections.join("\n\n");
}

function formatDurationMinutes(totalMinutes: number | null): string {
  if (totalMinutes === null) {
    return "No data";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  return `${hours}h ${minutes}m`;
}

function formatDurationSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

export function splitMessage(text: string, maxLength = 3500): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const splitIndex =
      remaining.lastIndexOf("\n\n", maxLength) > 0
        ? remaining.lastIndexOf("\n\n", maxLength)
        : remaining.lastIndexOf("\n", maxLength) > 0
          ? remaining.lastIndexOf("\n", maxLength)
          : maxLength;

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export function formatCoachContextDump(context: CoachContext): string {
  const lines: string[] = [
    `Health context dump for the last ${context.window_days} days.`,
    `Generated at: ${context.generated_at}`,
    "",
    "Use this as source-of-truth context for coaching. If data is missing, say so.",
    "",
    "Summary",
    `- Average sleep: ${formatDurationMinutes(context.summaries.average_sleep_minutes)}`,
    `- Average calories consumed: ${context.summaries.average_calories_consumed ?? "No data"}`,
    `- Average protein: ${context.summaries.average_protein_g ?? "No data"} g`,
    `- Total run distance: ${context.summaries.total_run_distance_km} km`,
    `- Run count: ${context.summaries.run_count}`,
    `- Workout count: ${context.summaries.workout_count}`,
    `- Average daily steps: ${context.summaries.average_steps ?? "No data"}`,
    "",
    "Recent Runs",
  ];

  if (context.runs.length === 0) {
    lines.push("- No runs logged");
  } else {
    for (const run of context.runs.slice(0, 10)) {
      const distanceKm = ((run.total_time_sec / 3600) * run.avg_speed_kmh).toFixed(
        2,
      );
      lines.push(
        `- ${run.run_date}: ${distanceKm} km, ${formatPace(run.avg_pace_sec_per_km)}, ${formatDurationSeconds(run.total_time_sec)}, avg HR ${run.avg_heart_rate_bpm}, cadence ${run.avg_run_cadence_spm}`,
      );
    }
  }

  lines.push("", "Recent Sleep");

  if (context.sleep.length === 0) {
    lines.push("- No sleep entries logged");
  } else {
    for (const sleep of context.sleep.slice(0, 10)) {
      lines.push(
        `- ${sleep.sleep_date}: ${formatDurationMinutes(sleep.sleep_duration_minutes)}, sleep start ${sleep.sleep_start}, sleep end ${sleep.sleep_end}, resting HR ${sleep.resting_heart_rate}, body battery ${sleep.body_battery_charge}`,
      );
    }
  }

  lines.push("", "Recent Macros");

  if (context.macros.length === 0) {
    lines.push("- No macros entries logged");
  } else {
    for (const macros of context.macros.slice(0, 10)) {
      lines.push(
        `- ${macros.entry_date}: ${macros.consumed_calories} kcal, protein ${macros.protein_consumed_g} g, carbs ${macros.carbs_consumed_g} g, fats ${macros.fats_consumed_g} g, fibre ${macros.fibre_consumed_g} g`,
      );
    }
  }

  lines.push("", "Recent Daily Stats");

  if (context.daily_stats.length === 0) {
    lines.push("- No daily stats entries logged");
  } else {
    for (const stats of context.daily_stats.slice(0, 10)) {
      lines.push(
        `- ${stats.entry_date}: ${stats.steps} steps, ${stats.calories_burned} calories burned, resting BPM ${stats.resting_bpm}, high BPM ${stats.high_bpm}, body battery +${stats.body_battery_gained}/-${stats.body_battery_drained}`,
      );
    }
  }

  lines.push("", "Recent Food Logs");

  if (context.food_logs.length === 0) {
    lines.push("- No food logs logged");
  } else {
    for (const foodLog of context.food_logs.slice(0, 5)) {
      const meals =
        foodLog.healthifyme_food_log_meals?.map(
          (meal) => `${meal.meal_name} (${meal.meal_calories} kcal)`,
        ) ?? [];
      lines.push(`- ${foodLog.entry_date}: ${meals.join(", ") || "No meals"}`);
    }
  }

  lines.push("", "Recent Workouts");

  if (context.workouts.length === 0) {
    lines.push("- No workouts logged");
  } else {
    for (const workout of context.workouts.slice(0, 10)) {
      const topMuscles =
        workout.hevy_workout_muscle_distribution
          ?.slice(0, 3)
          .map((muscle) => `${muscle.muscle_group} ${muscle.percentage}%`)
          .join(", ") ?? "No muscle distribution";
      lines.push(
        `- ${workout.workout_date}: ${workout.workout_name}, volume ${workout.total_volume_kg} kg, duration ${formatDurationSeconds(workout.duration_sec)}, exercises ${workout.exercise_count}, muscles ${topMuscles}`,
      );
    }
  }

  return lines.join("\n");
}
