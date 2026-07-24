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
