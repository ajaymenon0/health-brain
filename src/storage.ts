import config from "./config";
import {
  garminDailyStatsSchema,
  garminRunSchema,
  garminSleepSchema,
  healthifyMeFoodLogSchema,
  healthifyMeMacrosSchema,
  hevyWorkoutSchema,
  type ScreenshotType,
} from "./types";
import { z } from "zod";

type PersistScreenshotInput = {
  telegramUserId: number;
  screenshotType: ScreenshotType;
  entryDate: string;
  parsedResult: string;
};

type UserRow = {
  id: string;
  telegram_user_id: number;
};

const screenshotTypeToSchema = {
  healthifyme_macros: healthifyMeMacrosSchema,
  garmin_sleep: garminSleepSchema,
  garmin_run: garminRunSchema,
  garmin_daily_stats: garminDailyStatsSchema,
  healthifyme_food_log: healthifyMeFoodLogSchema,
  hevy_workout: hevyWorkoutSchema,
} satisfies Record<ScreenshotType, z.ZodTypeAny>;

function requireSupabaseConfig() {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to persist parsed screenshots.",
    );
  }

  return {
    url: config.supabase.url,
    serviceRoleKey: config.supabase.serviceRoleKey,
  };
}

function toIsoDate(value: string): string {
  if (!/^\d{8}$/.test(value)) {
    throw new Error(`Expected date in ddmmyyyy format, received "${value}".`);
  }

  const dd = value.slice(0, 2);
  const mm = value.slice(2, 4);
  const yyyy = value.slice(4, 8);

  return `${yyyy}-${mm}-${dd}`;
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const { url, serviceRoleKey } = requireSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase request failed (${response.status}): ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

async function ensureUser(telegramUserId: number): Promise<UserRow> {
  const rows = await supabaseRequest<UserRow[]>(
    "users?on_conflict=telegram_user_id&select=id,telegram_user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([{ telegram_user_id: telegramUserId }]),
    },
  );

  const user = rows[0];

  if (!user) {
    throw new Error("Unable to create or fetch Supabase user row.");
  }

  return user;
}

async function persistHealthifyMeMacros(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = healthifyMeMacrosSchema.parse(JSON.parse(parsedResult));

  await supabaseRequest(
    "healthifyme_macros_entries?on_conflict=user_id,entry_date",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          entry_date: entryDate,
          screenshot_type: parsed.screenshot_type,
          consumed_calories: parsed.calorie_budget.consumed_calories,
          calorie_goal: parsed.calorie_budget.calorie_goal,
          calorie_completion_percent: parsed.calorie_budget.completion_percent,
          protein_consumed_g: parsed.macronutrients.protein.consumed_g,
          protein_target_g: parsed.macronutrients.protein.target_g,
          protein_completion_percent:
            parsed.macronutrients.protein.completion_percent,
          fats_consumed_g: parsed.macronutrients.fats.consumed_g,
          fats_target_g: parsed.macronutrients.fats.target_g,
          fats_completion_percent:
            parsed.macronutrients.fats.completion_percent,
          carbs_consumed_g: parsed.macronutrients.carbs.consumed_g,
          carbs_target_g: parsed.macronutrients.carbs.target_g,
          carbs_completion_percent:
            parsed.macronutrients.carbs.completion_percent,
          fibre_consumed_g: parsed.macronutrients.fibre.consumed_g,
          fibre_target_g: parsed.macronutrients.fibre.target_g,
          fibre_completion_percent:
            parsed.macronutrients.fibre.completion_percent,
        },
      ]),
    },
  );
}

async function persistGarminSleep(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = garminSleepSchema.parse(JSON.parse(parsedResult));

  await supabaseRequest("garmin_sleep_entries?on_conflict=user_id,sleep_date", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        user_id: userId,
        sleep_date: entryDate,
        sleep_start: parsed.sleepStart,
        sleep_end: parsed.sleepEnd,
        sleep_duration_minutes: parsed.sleepDuration,
        deep_sleep_minutes: parsed.deepSleep,
        light_sleep_minutes: parsed.lightSleep,
        rem_sleep_minutes: parsed.remSleep,
        awake_duration_minutes: parsed.awakeDuration,
        resting_heart_rate: parsed.restingHeartRate,
        body_battery_charge: parsed.bodyBatteryCharge,
      },
    ]),
  });
}

async function persistGarminRun(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = garminRunSchema.parse(JSON.parse(parsedResult));

  await supabaseRequest("garmin_run_entries", {
    method: "POST",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify([
      {
        user_id: userId,
        run_date: entryDate,
        avg_pace_sec_per_km: parsed.pace.avg_pace_sec_per_km,
        avg_moving_pace_sec_per_km: parsed.pace.avg_moving_pace_sec_per_km,
        best_pace_sec_per_km: parsed.pace.best_pace_sec_per_km,
        avg_speed_kmh: parsed.speed.avg_speed_kmh,
        avg_moving_speed_kmh: parsed.speed.avg_moving_speed_kmh,
        max_speed_kmh: parsed.speed.max_speed_kmh,
        total_time_sec: parsed.timing.total_time_sec,
        moving_time_sec: parsed.timing.moving_time_sec,
        elapsed_time_sec: parsed.timing.elapsed_time_sec,
        run_time_sec: parsed.run_walk_detection.run_time_sec,
        walk_time_sec: parsed.run_walk_detection.walk_time_sec,
        idle_time_sec: parsed.run_walk_detection.idle_time_sec,
        avg_heart_rate_bpm: parsed.heart_rate.avg_heart_rate_bpm,
        max_heart_rate_bpm: parsed.heart_rate.max_heart_rate_bpm,
        aerobic_training_effect: parsed.training_effect.aerobic,
        anaerobic_training_effect: parsed.training_effect.anaerobic,
        avg_run_cadence_spm: parsed.running_dynamics.avg_run_cadence_spm,
        max_run_cadence_spm: parsed.running_dynamics.max_run_cadence_spm,
        avg_stride_length_m: parsed.running_dynamics.avg_stride_length_m,
        total_ascent_m: parsed.elevation.total_ascent_m,
        total_descent_m: parsed.elevation.total_descent_m,
        min_elevation_m: parsed.elevation.min_elevation_m,
        max_elevation_m: parsed.elevation.max_elevation_m,
        resting_calories: parsed.nutrition_hydration.resting_calories,
        active_calories: parsed.nutrition_hydration.active_calories,
        total_calories: parsed.nutrition_hydration.total_calories,
        estimated_sweat_loss_ml:
          parsed.nutrition_hydration.estimated_sweat_loss_ml,
        moderate_minutes: parsed.intensity_minutes.moderate_minutes,
        vigorous_minutes: parsed.intensity_minutes.vigorous_minutes,
        total_intensity_minutes: parsed.intensity_minutes.total_minutes,
      },
    ]),
  });
}

async function persistGarminDailyStats(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = garminDailyStatsSchema.parse(JSON.parse(parsedResult));

  await supabaseRequest(
    "garmin_daily_stats_entries?on_conflict=user_id,entry_date",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          entry_date: entryDate,
          screenshot_type: parsed.screenshot_type,
          steps: parsed.steps,
          sleep_duration_sec: parsed.sleep_duration_sec,
          calories_burned: parsed.calories_burned,
          resting_bpm: parsed.heart_rate.resting_bpm,
          high_bpm: parsed.heart_rate.high_bpm,
          body_battery_gained: parsed.body_battery.gained,
          body_battery_drained: parsed.body_battery.drained,
        },
      ]),
    },
  );
}

async function persistHealthifyMeFoodLog(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = healthifyMeFoodLogSchema.parse(JSON.parse(parsedResult));

  const [entry] = await supabaseRequest<Array<{ id: string }>>(
    "healthifyme_food_log_entries?select=id",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          entry_date: entryDate,
          screenshot_type: "healthifyme_food_log",
        },
      ]),
    },
  );

  if (!entry) {
    throw new Error("Unable to create healthifyme_food_log_entries row.");
  }

  for (const meal of parsed.meals) {
    const [mealRow] = await supabaseRequest<Array<{ id: string }>>(
      "healthifyme_food_log_meals?select=id",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            food_log_entry_id: entry.id,
            meal_name: meal.meal_name,
            meal_calories: meal.meal_calories,
          },
        ]),
      },
    );

    if (!mealRow) {
      throw new Error("Unable to create healthifyme_food_log_meals row.");
    }

    if (meal.foods.length > 0) {
      await supabaseRequest("healthifyme_food_log_foods", {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(
          meal.foods.map((food) => ({
            meal_id: mealRow.id,
            food_name: food.food_name,
            quantity: food.quantity,
            calories: food.calories,
          })),
        ),
      });
    }
  }
}

async function persistHevyWorkout(
  userId: string,
  entryDate: string,
  parsedResult: string,
) {
  const parsed = hevyWorkoutSchema.parse(JSON.parse(parsedResult));

  const [workout] = await supabaseRequest<Array<{ id: string }>>(
    "hevy_workout_entries?select=id",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          workout_date: entryDate,
          workout_name: parsed.workout_name,
          duration_sec: parsed.duration_sec,
          total_volume_kg: parsed.total_volume_kg,
          exercise_count: parsed.exercise_count,
        },
      ]),
    },
  );

  if (!workout) {
    throw new Error("Unable to create hevy_workout_entries row.");
  }

  if (parsed.muscle_distribution.length > 0) {
    await supabaseRequest("hevy_workout_muscle_distribution", {
      method: "POST",
      headers: {
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        parsed.muscle_distribution.map((muscle) => ({
          workout_entry_id: workout.id,
          muscle_group: muscle.muscle_group,
          percentage: muscle.percentage,
        })),
      ),
    });
  }

  for (const exercise of parsed.exercises) {
    const [exerciseRow] = await supabaseRequest<Array<{ id: string }>>(
      "hevy_workout_exercises?select=id",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify([
          {
            workout_entry_id: workout.id,
            exercise_name: exercise.exercise_name,
          },
        ]),
      },
    );

    if (!exerciseRow) {
      throw new Error("Unable to create hevy_workout_exercises row.");
    }

    if (exercise.sets.length > 0) {
      await supabaseRequest("hevy_workout_sets", {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(
          exercise.sets.map((set) => ({
            exercise_id: exerciseRow.id,
            set_number: set.set_number,
            weight_kg: set.weight_kg ?? null,
            reps: set.reps ?? null,
            duration_sec: set.duration_sec ?? null,
          })),
        ),
      });
    }
  }
}

export async function persistParsedScreenshot({
  telegramUserId,
  screenshotType,
  entryDate,
  parsedResult,
}: PersistScreenshotInput) {
  screenshotTypeToSchema[screenshotType].parse(JSON.parse(parsedResult));

  const user = await ensureUser(telegramUserId);
  const isoDate = toIsoDate(entryDate);

  if (screenshotType === "healthifyme_macros") {
    await persistHealthifyMeMacros(user.id, isoDate, parsedResult);
    return;
  }

  if (screenshotType === "garmin_sleep") {
    await persistGarminSleep(user.id, isoDate, parsedResult);
    return;
  }

  if (screenshotType === "garmin_run") {
    await persistGarminRun(user.id, isoDate, parsedResult);
    return;
  }

  if (screenshotType === "garmin_daily_stats") {
    await persistGarminDailyStats(user.id, isoDate, parsedResult);
    return;
  }

  if (screenshotType === "healthifyme_food_log") {
    await persistHealthifyMeFoodLog(user.id, isoDate, parsedResult);
    return;
  }

  await persistHevyWorkout(user.id, isoDate, parsedResult);
}
