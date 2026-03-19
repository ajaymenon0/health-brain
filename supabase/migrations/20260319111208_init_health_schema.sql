create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.healthifyme_macros_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  screenshot_type text not null default 'healthifyme_macros'
    check (screenshot_type = 'healthifyme_macros'),
  consumed_calories integer not null,
  calorie_goal integer not null,
  calorie_completion_percent numeric(6,2) not null,
  protein_consumed_g numeric(8,2) not null,
  protein_target_g numeric(8,2) not null,
  protein_completion_percent numeric(6,2) not null,
  fats_consumed_g numeric(8,2) not null,
  fats_target_g numeric(8,2) not null,
  fats_completion_percent numeric(6,2) not null,
  carbs_consumed_g numeric(8,2) not null,
  carbs_target_g numeric(8,2) not null,
  carbs_completion_percent numeric(6,2) not null,
  fibre_consumed_g numeric(8,2) not null,
  fibre_target_g numeric(8,2) not null,
  fibre_completion_percent numeric(6,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists healthifyme_macros_entries_user_date_idx
  on public.healthifyme_macros_entries (user_id, entry_date desc);

create table if not exists public.garmin_sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sleep_date date not null,
  sleep_start time not null,
  sleep_end time not null,
  sleep_duration_minutes integer not null,
  deep_sleep_minutes integer not null,
  light_sleep_minutes integer not null,
  rem_sleep_minutes integer not null,
  awake_duration_minutes integer not null,
  resting_heart_rate integer not null,
  body_battery_charge integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

create index if not exists garmin_sleep_entries_user_date_idx
  on public.garmin_sleep_entries (user_id, sleep_date desc);

create table if not exists public.garmin_run_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  run_date date not null,
  avg_pace_sec_per_km integer not null,
  avg_moving_pace_sec_per_km integer not null,
  best_pace_sec_per_km integer not null,
  avg_speed_kmh numeric(6,2) not null,
  avg_moving_speed_kmh numeric(6,2) not null,
  max_speed_kmh numeric(6,2) not null,
  total_time_sec integer not null,
  moving_time_sec integer not null,
  elapsed_time_sec integer not null,
  run_time_sec integer not null,
  walk_time_sec integer not null,
  idle_time_sec integer not null,
  avg_heart_rate_bpm integer not null,
  max_heart_rate_bpm integer not null,
  aerobic_training_effect numeric(4,2) not null,
  anaerobic_training_effect numeric(4,2) not null,
  avg_run_cadence_spm numeric(6,2) not null,
  max_run_cadence_spm numeric(6,2) not null,
  avg_stride_length_m numeric(6,3) not null,
  total_ascent_m numeric(8,2) not null,
  total_descent_m numeric(8,2) not null,
  min_elevation_m numeric(8,2) not null,
  max_elevation_m numeric(8,2) not null,
  resting_calories integer not null,
  active_calories integer not null,
  total_calories integer not null,
  estimated_sweat_loss_ml integer not null,
  moderate_minutes integer not null,
  vigorous_minutes integer not null,
  total_intensity_minutes integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists garmin_run_entries_user_date_idx
  on public.garmin_run_entries (user_id, run_date desc);

create table if not exists public.garmin_daily_stats_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  screenshot_type text not null default 'garmin_daily_stats'
    check (screenshot_type = 'garmin_daily_stats'),
  steps integer not null,
  sleep_duration_sec integer not null,
  calories_burned integer not null,
  resting_bpm integer not null,
  high_bpm integer not null,
  body_battery_gained integer not null,
  body_battery_drained integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists garmin_daily_stats_entries_user_date_idx
  on public.garmin_daily_stats_entries (user_id, entry_date desc);

create table if not exists public.healthifyme_food_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null,
  screenshot_type text not null default 'healthifyme_food_log'
    check (screenshot_type = 'healthifyme_food_log'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists healthifyme_food_log_entries_user_date_idx
  on public.healthifyme_food_log_entries (user_id, entry_date desc);

create table if not exists public.healthifyme_food_log_meals (
  id uuid primary key default gen_random_uuid(),
  food_log_entry_id uuid not null references public.healthifyme_food_log_entries(id) on delete cascade,
  meal_name text not null
    check (meal_name in ('breakfast', 'lunch', 'evening_snack', 'dinner')),
  meal_calories integer not null,
  created_at timestamptz not null default now()
);

create index if not exists healthifyme_food_log_meals_entry_idx
  on public.healthifyme_food_log_meals (food_log_entry_id);

create table if not exists public.healthifyme_food_log_foods (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.healthifyme_food_log_meals(id) on delete cascade,
  food_name text not null,
  quantity text not null,
  calories integer not null,
  created_at timestamptz not null default now()
);

create index if not exists healthifyme_food_log_foods_meal_idx
  on public.healthifyme_food_log_foods (meal_id);

create table if not exists public.hevy_workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_date date not null,
  workout_name text not null,
  duration_sec integer not null,
  total_volume_kg numeric(10,2) not null,
  exercise_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hevy_workout_entries_user_date_idx
  on public.hevy_workout_entries (user_id, workout_date desc);

create table if not exists public.hevy_workout_muscle_distribution (
  id uuid primary key default gen_random_uuid(),
  workout_entry_id uuid not null references public.hevy_workout_entries(id) on delete cascade,
  muscle_group text not null,
  percentage numeric(6,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists hevy_workout_muscle_distribution_entry_idx
  on public.hevy_workout_muscle_distribution (workout_entry_id);

create table if not exists public.hevy_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_entry_id uuid not null references public.hevy_workout_entries(id) on delete cascade,
  exercise_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists hevy_workout_exercises_entry_idx
  on public.hevy_workout_exercises (workout_entry_id);

create table if not exists public.hevy_workout_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.hevy_workout_exercises(id) on delete cascade,
  set_number integer not null,
  weight_kg numeric(8,2),
  reps integer,
  duration_sec integer,
  created_at timestamptz not null default now(),
  unique (exercise_id, set_number)
);

create index if not exists hevy_workout_sets_exercise_idx
  on public.hevy_workout_sets (exercise_id);
