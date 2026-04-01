import { ensureUser, supabaseRequest } from "./supabase";

type MacrosEntry = {
  entry_date: string;
  consumed_calories: number;
  protein_consumed_g: number;
  carbs_consumed_g: number;
  fats_consumed_g: number;
  fibre_consumed_g: number;
};

type SleepEntry = {
  sleep_date: string;
  sleep_start: string;
  sleep_end: string;
  sleep_duration_minutes: number;
  deep_sleep_minutes: number;
  light_sleep_minutes: number;
  rem_sleep_minutes: number;
  awake_duration_minutes: number;
  resting_heart_rate: number;
  body_battery_charge: number;
};

type RunEntry = {
  run_date: string;
  avg_pace_sec_per_km: number;
  avg_speed_kmh: number;
  total_time_sec: number;
  avg_heart_rate_bpm: number;
  total_calories: number;
  avg_run_cadence_spm: number;
  aerobic_training_effect: number;
  anaerobic_training_effect: number;
};

type DailyStatsEntry = {
  entry_date: string;
  steps: number;
  sleep_duration_sec: number;
  calories_burned: number;
  resting_bpm: number;
  high_bpm: number;
  body_battery_gained: number;
  body_battery_drained: number;
};

type FoodLogEntry = {
  id: string;
  entry_date: string;
  healthifyme_food_log_meals?: Array<{
    meal_name: string;
    meal_calories: number;
    healthifyme_food_log_foods?: Array<{
      food_name: string;
      quantity: string;
      calories: number;
    }>;
  }>;
};

type WorkoutEntry = {
  id: string;
  workout_date: string;
  workout_name: string;
  duration_sec: number;
  total_volume_kg: number;
  exercise_count: number;
  hevy_workout_muscle_distribution?: Array<{
    muscle_group: string;
    percentage: number;
  }>;
  hevy_workout_exercises?: Array<{
    exercise_name: string;
    hevy_workout_sets?: Array<{
      set_number: number;
      weight_kg: number | null;
      reps: number | null;
      duration_sec: number | null;
    }>;
  }>;
};

export type CoachContext = {
  window_days: number;
  generated_at: string;
  macros: MacrosEntry[];
  sleep: SleepEntry[];
  runs: RunEntry[];
  daily_stats: DailyStatsEntry[];
  food_logs: FoodLogEntry[];
  workouts: WorkoutEntry[];
  summaries: {
    average_sleep_minutes: number | null;
    average_calories_consumed: number | null;
    average_protein_g: number | null;
    total_run_distance_km: number;
    run_count: number;
    workout_count: number;
    average_steps: number | null;
  };
};

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

export async function buildCoachContext(
  telegramUserId: number,
): Promise<CoachContext> {
  const user = await ensureUser(telegramUserId);
  const startDate = isoDateDaysAgo(9);

  const [macros, sleep, runs, dailyStats, foodLogs, workouts] =
    await Promise.all([
      supabaseRequest<MacrosEntry[]>(
        `healthifyme_macros_entries?select=entry_date,consumed_calories,protein_consumed_g,carbs_consumed_g,fats_consumed_g,fibre_consumed_g&user_id=eq.${user.id}&entry_date=gte.${startDate}&order=entry_date.desc`,
        { method: "GET" },
      ),
      supabaseRequest<SleepEntry[]>(
        `garmin_sleep_entries?select=sleep_date,sleep_start,sleep_end,sleep_duration_minutes,deep_sleep_minutes,light_sleep_minutes,rem_sleep_minutes,awake_duration_minutes,resting_heart_rate,body_battery_charge&user_id=eq.${user.id}&sleep_date=gte.${startDate}&order=sleep_date.desc`,
        { method: "GET" },
      ),
      supabaseRequest<RunEntry[]>(
        `garmin_run_entries?select=run_date,avg_pace_sec_per_km,avg_speed_kmh,total_time_sec,avg_heart_rate_bpm,total_calories,avg_run_cadence_spm,aerobic_training_effect,anaerobic_training_effect&user_id=eq.${user.id}&run_date=gte.${startDate}&order=run_date.desc,created_at.desc`,
        { method: "GET" },
      ),
      supabaseRequest<DailyStatsEntry[]>(
        `garmin_daily_stats_entries?select=entry_date,steps,sleep_duration_sec,calories_burned,resting_bpm,high_bpm,body_battery_gained,body_battery_drained&user_id=eq.${user.id}&entry_date=gte.${startDate}&order=entry_date.desc`,
        { method: "GET" },
      ),
      supabaseRequest<FoodLogEntry[]>(
        `healthifyme_food_log_entries?select=id,entry_date,healthifyme_food_log_meals(meal_name,meal_calories,healthifyme_food_log_foods(food_name,quantity,calories))&user_id=eq.${user.id}&entry_date=gte.${startDate}&order=entry_date.desc`,
        { method: "GET" },
      ),
      supabaseRequest<WorkoutEntry[]>(
        `hevy_workout_entries?select=id,workout_date,workout_name,duration_sec,total_volume_kg,exercise_count,hevy_workout_muscle_distribution(muscle_group,percentage),hevy_workout_exercises(exercise_name,hevy_workout_sets(set_number,weight_kg,reps,duration_sec))&user_id=eq.${user.id}&workout_date=gte.${startDate}&order=workout_date.desc,created_at.desc`,
        { method: "GET" },
      ),
    ]);

  const totalRunDistanceKm = Number(
    runs
      .reduce(
        (sum, run) => sum + (run.total_time_sec / 3600) * run.avg_speed_kmh,
        0,
      )
      .toFixed(2),
  );

  return {
    window_days: 10,
    generated_at: new Date().toISOString(),
    macros,
    sleep,
    runs,
    daily_stats: dailyStats,
    food_logs: foodLogs,
    workouts,
    summaries: {
      average_sleep_minutes: average(
        sleep.map((entry) => entry.sleep_duration_minutes),
      ),
      average_calories_consumed: average(
        macros.map((entry) => entry.consumed_calories),
      ),
      average_protein_g: average(macros.map((entry) => entry.protein_consumed_g)),
      total_run_distance_km: totalRunDistanceKm,
      run_count: runs.length,
      workout_count: workouts.length,
      average_steps: average(dailyStats.map((entry) => entry.steps)),
    },
  };
}
