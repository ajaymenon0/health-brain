import { Scenes } from "telegraf";
import { z } from "zod";
export type DateChoice = "date_today" | "date_yesterday" | "date_custom";

export type ScreenshotType =
  | "garmin_sleep"
  | "healthifyme_macros"
  | "healthifyme_food_log"
  | "garmin_run"
  | "garmin_daily_stats"
  | "hevy_workout";

export interface WizardSession extends Scenes.WizardSessionData {
  date?: string | undefined;
  expectsCustomDate?: boolean;
  photoFileId?: string;
  screenshotType?: ScreenshotType;
  parsedResult?: string | undefined;
  awaitingSaveConfirmation?: boolean | undefined;
}

export interface BotContext extends Scenes.WizardContext<WizardSession> {
  scene: Scenes.SceneContextScene<BotContext, WizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  session: Scenes.WizardSession<WizardSession>;
}

export const healthifyMeMacrosSchema = z.object({
  screenshot_type: z.literal("healthifyme_macros"),

  calorie_budget: z.object({
    consumed_calories: z
      .number()
      .describe(
        "Calories consumed today. Extract from text like '2010 / 2050 Cal'.",
      ),

    calorie_goal: z
      .number()
      .describe(
        "Daily calorie goal. Extract the second number from '2010 / 2050 Cal'.",
      ),

    completion_percent: z
      .number()
      .describe(
        "Percentage of calorie budget consumed. Extract from the large percentage indicator (example: 98%).",
      ),
  }),

  macronutrients: z.object({
    protein: z.object({
      consumed_g: z
        .number()
        .describe(
          "Protein consumed in grams. Extract from '125.0 g / 153.8 g'.",
        ),

      target_g: z
        .number()
        .describe(
          "Daily protein target in grams. Extract the second value from '125.0 g / 153.8 g'.",
        ),

      completion_percent: z
        .number()
        .describe("Percentage of protein target achieved (example: 81%)."),
    }),

    fats: z.object({
      consumed_g: z
        .number()
        .describe("Fat consumed in grams. Extract from '91.9 g / 56.9 g'."),

      target_g: z.number().describe("Daily fat target in grams."),

      completion_percent: z
        .number()
        .describe("Percentage of fat target achieved (example: 161%)."),
    }),

    carbs: z.object({
      consumed_g: z
        .number()
        .describe(
          "Carbohydrates consumed in grams. Extract from '175.1 g / 230.6 g'.",
        ),

      target_g: z.number().describe("Daily carbohydrate target in grams."),

      completion_percent: z
        .number()
        .describe("Percentage of carbohydrate target achieved (example: 76%)."),
    }),

    fibre: z.object({
      consumed_g: z
        .number()
        .describe("Fibre consumed in grams. Extract from '30.9 g / 30.0 g'."),

      target_g: z.number().describe("Daily fibre target in grams."),

      completion_percent: z
        .number()
        .describe("Percentage of fibre target achieved (example: 103%)."),
    }),
  }),
});

export const garminSleepSchema = z.object({
  sleepStart: z.iso.time(),
  sleepEnd: z.iso.time(),
  sleepDuration: z.number().describe("Duration in minutes"),
  deepSleep: z.number().describe("Duration in minutes"),
  lightSleep: z.number().describe("Duration in minutes"),
  remSleep: z.number().describe("Duration in minutes"),
  awakeDuration: z.number().describe("Duration in minutes"),
  restingHeartRate: z.number(),
  bodyBatteryCharge: z.number(),
});

export const garminRunSchema = z.object({
  pace: z.object({
    avg_pace_sec_per_km: z
      .number()
      .describe(
        "Average pace in seconds per kilometer. Convert from pace format like '7:28 /km' → 448 seconds.",
      ),

    avg_moving_pace_sec_per_km: z
      .number()
      .describe(
        "Average moving pace in seconds per kilometer. Convert '7:24 /km' → 444 seconds.",
      ),

    best_pace_sec_per_km: z
      .number()
      .describe(
        "Best pace in seconds per kilometer. Convert '4:41 /km' → 281 seconds.",
      ),
  }),

  speed: z.object({
    avg_speed_kmh: z.number().describe("Average speed in kilometers per hour."),

    avg_moving_speed_kmh: z
      .number()
      .describe("Average moving speed in kilometers per hour."),

    max_speed_kmh: z.number().describe("Maximum speed in kilometers per hour."),
  }),

  timing: z.object({
    total_time_sec: z
      .number()
      .describe(
        "Total activity time converted to seconds. Example: '30:05' → 1805 seconds.",
      ),

    moving_time_sec: z
      .number()
      .describe(
        "Moving time converted to seconds. Example: '29:46' → 1786 seconds.",
      ),

    elapsed_time_sec: z
      .number()
      .describe(
        "Elapsed activity time converted to seconds. Example: '30:05' → 1805 seconds.",
      ),
  }),

  run_walk_detection: z.object({
    run_time_sec: z
      .number()
      .describe(
        "Running time converted to seconds. Example: '23:16' → 1396 seconds.",
      ),

    walk_time_sec: z
      .number()
      .describe(
        "Walking time converted to seconds. Example: '6:41' → 401 seconds.",
      ),

    idle_time_sec: z
      .number()
      .describe(
        "Idle time converted to seconds. Example: '0:12' → 12 seconds.",
      ),
  }),

  heart_rate: z.object({
    avg_heart_rate_bpm: z
      .number()
      .describe("Average heart rate in beats per minute."),

    max_heart_rate_bpm: z
      .number()
      .describe("Maximum heart rate in beats per minute."),
  }),

  training_effect: z.object({
    aerobic: z.number().describe("Aerobic training effect score from Garmin."),

    anaerobic: z
      .number()
      .describe("Anaerobic training effect score from Garmin."),
  }),

  running_dynamics: z.object({
    avg_run_cadence_spm: z
      .number()
      .describe("Average running cadence in steps per minute."),

    max_run_cadence_spm: z
      .number()
      .describe("Maximum running cadence in steps per minute."),

    avg_stride_length_m: z
      .number()
      .describe("Average stride length in meters."),
  }),

  elevation: z.object({
    total_ascent_m: z.number().describe("Total ascent in meters."),

    total_descent_m: z.number().describe("Total descent in meters."),

    min_elevation_m: z.number().describe("Minimum elevation in meters."),

    max_elevation_m: z.number().describe("Maximum elevation in meters."),
  }),

  nutrition_hydration: z.object({
    resting_calories: z.number().describe("Resting calories burned."),

    active_calories: z.number().describe("Active calories burned."),

    total_calories: z.number().describe("Total calories burned."),

    estimated_sweat_loss_ml: z
      .number()
      .describe("Estimated sweat loss in milliliters."),
  }),

  intensity_minutes: z.object({
    moderate_minutes: z.number().describe("Moderate intensity minutes."),

    vigorous_minutes: z.number().describe("Vigorous intensity minutes."),

    total_minutes: z.number().describe("Total intensity minutes."),
  }),
});

export const garminDailyStatsSchema = z.object({
  screenshot_type: z.literal("garmin_daily_stats"),

  steps: z
    .number()
    .describe(
      "Total steps for the day. Extract from the 'Steps' row. Remove commas if present.",
    ),

  sleep_duration_sec: z
    .number()
    .describe(
      "Total sleep duration converted to seconds. Example: '8h' → 28800 seconds.",
    ),

  calories_burned: z
    .number()
    .describe(
      "Total calories burned for the day from the 'Calories Burned' row.",
    ),

  heart_rate: z.object({
    resting_bpm: z
      .number()
      .describe(
        "Resting heart rate in beats per minute. Extract from text like '57 Rest'.",
      ),

    high_bpm: z
      .number()
      .describe(
        "Highest heart rate in beats per minute. Extract from text like '179 High'.",
      ),
  }),

  body_battery: z.object({
    gained: z
      .number()
      .describe(
        "Body Battery gained during the day. Extract the positive value from '+79 / -82'.",
      ),

    drained: z
      .number()
      .describe(
        "Body Battery drained during the day. Extract the negative value magnitude from '+79 / -82'. Return as a positive number.",
      ),
  }),
});

export const healthifyMeFoodLogSchema = z.object({
  meals: z.array(
    z.object({
      meal_name: z
        .enum(["breakfast", "lunch", "evening_snack", "dinner"])
        .describe(
          "Meal section title in the HealthifyMe UI such as Breakfast, Lunch, Evening Snack, or Dinner.",
        ),

      meal_calories: z
        .number()
        .describe(
          "Total calories shown next to the meal header. Example: '449 of 410 Cal'. Extract the consumed calories.",
        ),

      foods: z.array(
        z.object({
          food_name: z
            .string()
            .describe("Name of the food item listed in the meal section."),

          quantity: z
            .string()
            .describe(
              "Food quantity exactly as shown (example: '1 scoop', '40 grams', '2 tsp', '120 ml').",
            ),

          calories: z
            .number()
            .describe(
              "Calories for this food item. Extract the numeric value from text like '120 Cal'.",
            ),
        }),
      ),
    }),
  ),
});

export const hevyWorkoutSchema = z.object({
  workout_name: z
    .string()
    .describe("Workout title shown at the top of the screen."),

  duration_sec: z
    .number()
    .describe(
      "Workout duration converted to seconds. Example: '46 min' → 2760 seconds.",
    ),

  total_volume_kg: z
    .number()
    .describe(
      "Total training volume in kilograms shown near the workout header.",
    ),

  exercise_count: z
    .number()
    .describe("Total number of exercises listed in the workout."),

  muscle_distribution: z
    .array(
      z.object({
        muscle_group: z
          .string()
          .describe(
            "Muscle group shown in the distribution chart (example: Arms, Back, Shoulders).",
          ),

        percentage: z
          .number()
          .describe(
            "Percentage of workout volume attributed to this muscle group.",
          ),
      }),
    )
    .describe(
      "Muscle group distribution bars shown under the workout summary.",
    ),

  exercises: z.array(
    z.object({
      exercise_name: z
        .string()
        .describe(
          "Name of the exercise such as 'Pull Up (Band)' or 'Incline Bench Press (Dumbbell)'.",
        ),

      sets: z.array(
        z.object({
          set_number: z.number().describe("Set index number starting from 1."),

          weight_kg: z
            .number()
            .nullable()
            .describe("Weight used in kilograms for this set if present."),

          reps: z
            .number()
            .nullable()
            .describe("Number of repetitions performed in this set."),

          duration_sec: z
            .number()
            .nullable()
            .describe(
              "Duration in seconds for time-based exercises such as Plank.",
            ),
        }),
      ),
    }),
  ),
});
