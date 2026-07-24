import { ensureUser, supabaseRequest } from "./supabase";

export type Period = "10" | "30" | "90" | "year" | "all";

function periodLimit(period: Period): string {
  if (period === "all") return "";
  const n = period === "year" ? 365 : period;
  return `&limit=${n}`;
}

export type SleepRow = {
  sleep_date: string;
  sleep_duration_minutes: number;
  deep_sleep_minutes: number;
  light_sleep_minutes: number;
  rem_sleep_minutes: number;
  awake_duration_minutes: number;
  resting_heart_rate: number;
  body_battery_charge: number;
};

export type RunRow = {
  run_date: string;
  avg_pace_sec_per_km: number;
  avg_speed_kmh: number;
  total_time_sec: number;
  avg_heart_rate_bpm: number;
  total_calories: number;
  aerobic_training_effect: number;
};

export type DailyStatsRow = {
  entry_date: string;
  steps: number;
  calories_burned: number;
  resting_bpm: number;
  high_bpm: number;
  body_battery_gained: number;
  body_battery_drained: number;
};

export type SportActivityRow = {
  activity_date: string;
  total_time_sec: number;
  avg_heart_rate_bpm: number;
  max_heart_rate_bpm: number;
  total_calories: number;
  aerobic_training_effect: number;
  total_intensity_minutes: number;
};

export type MacrosRow = {
  entry_date: string;
  consumed_calories: number;
  calorie_goal: number;
  protein_consumed_g: number;
  carbs_consumed_g: number;
  fats_consumed_g: number;
  fibre_consumed_g: number;
};

export type WeightRow = {
  entry_date: string;
  weight_kg: number;
  weight_status: string | null;
  body_fat_percent: number;
  body_fat_status: string | null;
  muscle_mass_percent: number;
  muscle_mass_percent_status: string | null;
  bmi: number;
  bmi_status: string | null;
  body_hydration_percent: number;
  body_hydration_status: string | null;
  visceral_fat_percent: number;
  visceral_fat_status: string | null;
  health_score: number;
};

export type FoodLogRow = {
  entry_date: string;
  healthifyme_food_log_meals?: Array<{
    meal_name: string;
    meal_calories: number;
  }>;
};

export type WorkoutRow = {
  workout_date: string;
  workout_name: string;
  duration_sec: number;
  total_volume_kg: number;
  exercise_count: number;
};

export type DashboardStats = {
  sleep: {
    avgDurationMinutes: number | null;
    lowestRestingHR: { bpm: number; date: string } | null;
  };
  runs: {
    distanceThisWeekKm: number;
    distanceThisMonthKm: number;
    distanceThisYearKm: number;
  };
  dailyStats: {
    avgStepsAllTime: number | null;
    avgStepsThisWeek: number | null;
  };
  macros: {
    avgConsumedCalories: number | null;
    avgConsumedProteinG: number | null;
  };
};

export type DashboardData = {
  generatedAt: string;
  sleep: SleepRow[];
  runs: RunRow[];
  dailyStats: DailyStatsRow[];
  sportActivities: SportActivityRow[];
  macros: MacrosRow[];
  weights: WeightRow[];
  foodLogs: FoodLogRow[];
  workouts: WorkoutRow[];
  stats: DashboardStats;
};

// --- date helpers ---

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1)); // Monday
  d.setUTCHours(0, 0, 0, 0);
  return isoDate(d);
}

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYearISO(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

// --- stat helpers ---

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function runDistanceKm(runs: Array<{ total_time_sec: number; avg_speed_kmh: number }>): number {
  return +runs.reduce((sum, r) => sum + (r.total_time_sec / 3600) * r.avg_speed_kmh, 0).toFixed(2);
}

// ---

export async function fetchDashboardData(
  telegramUserId: number,
  period: Period = "10",
): Promise<DashboardData> {
  const user = await ensureUser(telegramUserId);
  const uid = user.id;

  const weekStart = startOfWeekISO();
  const monthStart = startOfMonthISO();
  const yearStart = startOfYearISO();
  const lim = periodLimit(period);

  const [
    sleep,
    runs,
    dailyStats,
    sportActivities,
    macros,
    weights,
    foodLogs,
    workouts,
    // fixed-window stats
    runsThisWeek,
    runsThisMonth,
    runsThisYear,
    stepsThisWeek,
  ] = await Promise.all([
    supabaseRequest<SleepRow[]>(
      `garmin_sleep_entries?select=sleep_date,sleep_duration_minutes,deep_sleep_minutes,light_sleep_minutes,rem_sleep_minutes,awake_duration_minutes,resting_heart_rate,body_battery_charge&user_id=eq.${uid}&order=sleep_date.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<RunRow[]>(
      `garmin_run_entries?select=run_date,avg_pace_sec_per_km,avg_speed_kmh,total_time_sec,avg_heart_rate_bpm,total_calories,aerobic_training_effect&user_id=eq.${uid}&order=run_date.desc,created_at.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<DailyStatsRow[]>(
      `garmin_daily_stats_entries?select=entry_date,steps,calories_burned,resting_bpm,high_bpm,body_battery_gained,body_battery_drained&user_id=eq.${uid}&order=entry_date.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<SportActivityRow[]>(
      `garmin_sport_activity_entries?select=activity_date,total_time_sec,avg_heart_rate_bpm,max_heart_rate_bpm,total_calories,aerobic_training_effect,total_intensity_minutes&user_id=eq.${uid}&order=activity_date.desc,created_at.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<MacrosRow[]>(
      `healthifyme_macros_entries?select=entry_date,consumed_calories,calorie_goal,protein_consumed_g,carbs_consumed_g,fats_consumed_g,fibre_consumed_g&user_id=eq.${uid}&order=entry_date.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<WeightRow[]>(
      `healthifyme_weight_entries?select=entry_date,weight_kg,weight_status,body_fat_percent,body_fat_status,muscle_mass_percent,muscle_mass_percent_status,bmi,bmi_status,body_hydration_percent,body_hydration_status,visceral_fat_percent,visceral_fat_status,health_score&user_id=eq.${uid}&order=entry_date.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<FoodLogRow[]>(
      `healthifyme_food_log_entries?select=entry_date,healthifyme_food_log_meals(meal_name,meal_calories)&user_id=eq.${uid}&order=entry_date.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<WorkoutRow[]>(
      `hevy_workout_entries?select=workout_date,workout_name,duration_sec,total_volume_kg,exercise_count&user_id=eq.${uid}&order=workout_date.desc,created_at.desc${lim}`,
      { method: "GET" },
    ),
    supabaseRequest<Array<{ total_time_sec: number; avg_speed_kmh: number }>>(
      `garmin_run_entries?select=total_time_sec,avg_speed_kmh&user_id=eq.${uid}&run_date=gte.${weekStart}`,
      { method: "GET" },
    ),
    supabaseRequest<Array<{ total_time_sec: number; avg_speed_kmh: number }>>(
      `garmin_run_entries?select=total_time_sec,avg_speed_kmh&user_id=eq.${uid}&run_date=gte.${monthStart}`,
      { method: "GET" },
    ),
    supabaseRequest<Array<{ total_time_sec: number; avg_speed_kmh: number }>>(
      `garmin_run_entries?select=total_time_sec,avg_speed_kmh&user_id=eq.${uid}&run_date=gte.${yearStart}`,
      { method: "GET" },
    ),
    supabaseRequest<Array<{ steps: number }>>(
      `garmin_daily_stats_entries?select=steps&user_id=eq.${uid}&entry_date=gte.${weekStart}`,
      { method: "GET" },
    ),
  ]);

  const lowestHRRow = sleep.reduce<SleepRow | null>(
    (min, r) => (min === null || r.resting_heart_rate < min.resting_heart_rate ? r : min),
    null,
  );

  // Period-bounded stats derived directly from the display data
  const stats: DashboardStats = {
    sleep: {
      avgDurationMinutes: avg(sleep.map((r) => r.sleep_duration_minutes)),
      lowestRestingHR: lowestHRRow
        ? { bpm: lowestHRRow.resting_heart_rate, date: lowestHRRow.sleep_date }
        : null,
    },
    runs: {
      distanceThisWeekKm: runDistanceKm(runsThisWeek),
      distanceThisMonthKm: runDistanceKm(runsThisMonth),
      distanceThisYearKm: runDistanceKm(runsThisYear),
    },
    dailyStats: {
      avgStepsAllTime: avg(dailyStats.map((r) => r.steps)),
      avgStepsThisWeek: avg(stepsThisWeek.map((r) => r.steps)),
    },
    macros: {
      avgConsumedCalories: avg(macros.map((r) => r.consumed_calories)),
      avgConsumedProteinG: avg(macros.map((r) => r.protein_consumed_g)),
    },
  };

  return {
    generatedAt: new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    sleep,
    runs,
    dailyStats,
    sportActivities,
    macros,
    weights,
    foodLogs,
    workouts,
    stats,
  };
}
