import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date (YYYY-MM-DD)");
export const rangeSchema = z.object({ start_date: date, end_date: date }).strict().refine(
  input => input.end_date >= input.start_date && Date.parse(input.end_date) - Date.parse(input.start_date) <= 365 * 86400000,
  "Date range must be ordered and at most 366 inclusive days",
);
export const pageSchema = rangeSchema.safeExtend({
  offset: z.number().int().min(0).max(100000).default(0),
  limit: z.number().int().min(1).max(100).default(50),
});
export type DateRange = z.infer<typeof rangeSchema>;
type Row = Record<string, unknown>;
export const datasets = {
  nutrition: { table: "healthifyme_macros_entries", date: "entry_date", fields: "consumed_calories,calorie_goal,protein_consumed_g,protein_target_g,carbs_consumed_g,fats_consumed_g,fibre_consumed_g", description: "Daily calorie intake, calorie goals, and macros in grams." },
  sleep: { table: "garmin_sleep_entries", date: "sleep_date", fields: "sleep_start,sleep_end,sleep_duration_minutes,deep_sleep_minutes,light_sleep_minutes,rem_sleep_minutes,awake_duration_minutes,resting_heart_rate,body_battery_charge", description: "Sleep duration and stages in minutes, resting heart rate in bpm, and body battery charge." },
  daily_activity: { table: "garmin_daily_stats_entries", date: "entry_date", fields: "steps,sleep_duration_sec,calories_burned,resting_bpm,high_bpm,body_battery_gained,body_battery_drained", description: "Daily steps, calories burned, heart rate in bpm, and body battery." },
  runs: { table: "garmin_run_entries", date: "run_date", fields: "avg_pace_sec_per_km,avg_speed_kmh,total_time_sec,avg_heart_rate_bpm,max_heart_rate_bpm,total_calories,aerobic_training_effect,anaerobic_training_effect", description: "Running pace in seconds/km, speed in km/h, duration in seconds, and heart rate in bpm." },
  sport_activities: { table: "garmin_sport_activity_entries", date: "activity_date", fields: "total_time_sec,avg_heart_rate_bpm,max_heart_rate_bpm,total_calories,aerobic_training_effect,anaerobic_training_effect,total_intensity_minutes", description: "Sport sessions with duration in seconds, heart rate in bpm, calories and training effects." },
  weight_history: { table: "healthifyme_weight_entries", date: "entry_date", fields: "weight_kg,body_fat_percent,muscle_mass_percent,bmi,body_hydration_percent,visceral_fat_percent,health_score", description: "Weight in kg and body composition percentages." },
  food_log: { table: "healthifyme_food_log_entries", date: "entry_date", fields: "healthifyme_food_log_meals(meal_name,meal_calories,healthifyme_food_log_foods(food_name,quantity,calories))", description: "Meals, individual foods, quantities, and calories from logged screenshots." },
  workouts: { table: "hevy_workout_entries", date: "workout_date", fields: "workout_name,duration_sec,total_volume_kg,exercise_count,hevy_workout_exercises(exercise_name,hevy_workout_sets(set_number,weight_kg,reps,duration_sec))", description: "Strength workouts with exercises and sets, weights in kg and duration in seconds." },
} as const;
export type Dataset = keyof typeof datasets;

export class HealthData {
  constructor(private readonly url: string, private readonly key: string, private readonly telegramUserId: number, private readonly request: typeof fetch = fetch) {}

  private async get(table: string, params: URLSearchParams): Promise<Row[]> {
    const response = await this.request(`${this.url.replace(/\/$/, "")}/rest/v1/${table}?${params}`, {
      method: "GET",
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Health data is temporarily unavailable. Please retry.");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Unexpected health data response.");
    return rows as Row[];
  }

  private async userId(): Promise<string> {
    const rows = await this.get("users", new URLSearchParams({ select: "id", telegram_user_id: `eq.${this.telegramUserId}`, limit: "1" }));
    const id = rows[0]?.id;
    if (typeof id !== "string" || !z.string().uuid().safeParse(id).success) throw new Error("No existing Health Brain user found. Save a record through Telegram first.");
    return id;
  }

  async records(dataset: Dataset, input: z.infer<typeof pageSchema>) {
    const args = pageSchema.parse(input);
    const definition = datasets[dataset];
    const params = new URLSearchParams({
      select: `id,${definition.date},${definition.fields}`,
      user_id: `eq.${await this.userId()}`,
      order: `${definition.date}.asc,id.asc`,
      offset: String(args.offset), limit: String(args.limit),
    });
    params.append(definition.date, `gte.${args.start_date}`);
    params.append(definition.date, `lte.${args.end_date}`);
    const records = await this.get(definition.table, params);
    // A full page may be the final page; an extra empty request resolves that safely.
    return { dataset, start_date: args.start_date, end_date: args.end_date, generated_at: new Date().toISOString(), records, next_offset: records.length === args.limit ? args.offset + records.length : null,
      notes: "Dates are the dates saved from screenshots. Missing records are unknown, not zero. Values may contain screenshot extraction errors. Follow next_offset until null before analyzing the whole range." };
  }

  async summary(input: DateRange) {
    const range = rangeSchema.parse(input);
    const coverage: Record<string, unknown> = {};
    for (const dataset of Object.keys(datasets) as Dataset[]) {
      const rows: Row[] = [];
      let offset: number | null = 0;
      // Bound work and disclose truncation instead of silently producing full-range claims.
      while (offset !== null && rows.length < 1000) {
        const page = await this.records(dataset, { ...range, offset, limit: 100 });
        rows.push(...page.records);
        offset = page.next_offset;
      }
      const averages: Record<string, number> = {};
      const numericFields = new Set(rows.flatMap(row => Object.keys(row).filter(key => typeof row[key] === "number")));
      for (const field of numericFields) {
        const values = rows.map(row => row[field]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        if (values.length) averages[field] = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
      }
      coverage[dataset] = { record_count: rows.length, days_with_records: new Set(rows.map(row => row[datasets[dataset].date])).size, truncated: offset !== null, next_offset: offset, per_record_averages: averages };
    }
    return { ...range, generated_at: new Date().toISOString(), coverage, notes: "Averages use recorded, non-null numeric values only; they are per record, not per calendar day. Empty datasets have no averages. Truncated datasets describe only the first 1000 records. Retrieve detail tools for comparisons; associations do not establish causation." };
  }
}
