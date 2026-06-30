import fs from "fs";
import path from "path";
import { ensureUser, supabaseRequest } from "./supabase";

export const publicDir = path.join(process.cwd(), "public");

type SleepRow = {
  sleep_date: string;
  sleep_duration_minutes: number;
  deep_sleep_minutes: number;
  light_sleep_minutes: number;
  rem_sleep_minutes: number;
  awake_duration_minutes: number;
  resting_heart_rate: number;
  body_battery_charge: number;
};

type RunRow = {
  run_date: string;
  avg_pace_sec_per_km: number;
  avg_speed_kmh: number;
  total_time_sec: number;
  avg_heart_rate_bpm: number;
  total_calories: number;
  aerobic_training_effect: number;
};

type DailyStatsRow = {
  entry_date: string;
  steps: number;
  calories_burned: number;
  resting_bpm: number;
  high_bpm: number;
  body_battery_gained: number;
  body_battery_drained: number;
};

type SportActivityRow = {
  activity_date: string;
  total_time_sec: number;
  avg_heart_rate_bpm: number;
  max_heart_rate_bpm: number;
  total_calories: number;
  aerobic_training_effect: number;
  total_intensity_minutes: number;
};

type MacrosRow = {
  entry_date: string;
  consumed_calories: number;
  calorie_goal: number;
  protein_consumed_g: number;
  carbs_consumed_g: number;
  fats_consumed_g: number;
  fibre_consumed_g: number;
};

type FoodLogRow = {
  entry_date: string;
  healthifyme_food_log_meals?: Array<{
    meal_name: string;
    meal_calories: number;
  }>;
};

type WorkoutRow = {
  workout_date: string;
  workout_name: string;
  duration_sec: number;
  total_volume_kg: number;
  exercise_count: number;
};

function fmtDurMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function fmtDurSecs(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function fmtNum(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<p class="no-data">No records found.</p>`;
  }
  const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n");
  return `<div class="table-wrap"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

function section(id: string, title: string, content: string): string {
  return `<section id="${id}"><h2>${title}</h2>${content}</section>`;
}

function sleepSection(rows: SleepRow[]): string {
  const headers = ["Date", "Duration", "Deep", "Light", "REM", "Awake", "Resting HR", "Body Battery"];
  const data = rows.map((r) => [
    r.sleep_date,
    fmtDurMins(r.sleep_duration_minutes),
    fmtDurMins(r.deep_sleep_minutes),
    fmtDurMins(r.light_sleep_minutes),
    fmtDurMins(r.rem_sleep_minutes),
    fmtDurMins(r.awake_duration_minutes),
    String(r.resting_heart_rate),
    String(r.body_battery_charge),
  ]);
  return section("sleep", "Sleep", table(headers, data));
}

function runsSection(rows: RunRow[]): string {
  const headers = ["Date", "Distance", "Avg Pace", "Duration", "Avg HR", "Calories", "Aerobic TE"];
  const data = rows.map((r) => {
    const distKm = ((r.total_time_sec / 3600) * r.avg_speed_kmh).toFixed(2);
    return [
      r.run_date,
      `${distKm} km`,
      fmtPace(r.avg_pace_sec_per_km),
      fmtDurSecs(r.total_time_sec),
      String(r.avg_heart_rate_bpm),
      String(r.total_calories),
      fmtNum(r.aerobic_training_effect),
    ];
  });
  return section("runs", "Runs", table(headers, data));
}

function dailyStatsSection(rows: DailyStatsRow[]): string {
  const headers = ["Date", "Steps", "Calories Burned", "Resting BPM", "High BPM", "Body Battery"];
  const data = rows.map((r) => [
    r.entry_date,
    r.steps.toLocaleString(),
    String(r.calories_burned),
    String(r.resting_bpm),
    String(r.high_bpm),
    `+${r.body_battery_gained} / −${r.body_battery_drained}`,
  ]);
  return section("daily-stats", "Daily Stats", table(headers, data));
}

function sportActivitiesSection(rows: SportActivityRow[]): string {
  const headers = ["Date", "Duration", "Avg HR", "Max HR", "Calories", "Aerobic TE", "Intensity"];
  const data = rows.map((r) => [
    r.activity_date,
    fmtDurSecs(r.total_time_sec),
    String(r.avg_heart_rate_bpm),
    String(r.max_heart_rate_bpm),
    String(r.total_calories),
    fmtNum(r.aerobic_training_effect),
    `${r.total_intensity_minutes} min`,
  ]);
  return section("sport-activities", "Sport / Activities", table(headers, data));
}

function macrosSection(rows: MacrosRow[]): string {
  const headers = ["Date", "Calories", "Goal", "Protein (g)", "Carbs (g)", "Fats (g)", "Fibre (g)"];
  const data = rows.map((r) => [
    r.entry_date,
    String(r.consumed_calories),
    String(r.calorie_goal),
    fmtNum(r.protein_consumed_g),
    fmtNum(r.carbs_consumed_g),
    fmtNum(r.fats_consumed_g),
    fmtNum(r.fibre_consumed_g),
  ]);
  return section("macros", "Macros", table(headers, data));
}

function foodLogSection(rows: FoodLogRow[]): string {
  const mealOrder = ["breakfast", "lunch", "evening_snack", "dinner"] as const;
  const headers = ["Date", "Breakfast", "Lunch", "Evening Snack", "Dinner", "Total"];
  const data = rows.map((r) => {
    const meals = r.healthifyme_food_log_meals ?? [];
    const byName = Object.fromEntries(meals.map((m) => [m.meal_name, m.meal_calories]));
    const total = meals.reduce((sum, m) => sum + m.meal_calories, 0);
    return [
      r.entry_date,
      ...mealOrder.map((name) => (byName[name] !== undefined ? `${byName[name]} kcal` : "—")),
      `${total} kcal`,
    ];
  });
  return section("food-log", "Food Log", table(headers, data));
}

function workoutsSection(rows: WorkoutRow[]): string {
  const headers = ["Date", "Workout", "Duration", "Volume (kg)", "Exercises"];
  const data = rows.map((r) => [
    r.workout_date,
    r.workout_name,
    fmtDurSecs(r.duration_sec),
    fmtNum(r.total_volume_kg, 1),
    String(r.exercise_count),
  ]);
  return section("workouts", "Workouts", table(headers, data));
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #f5f5f5;
    --surface: #ffffff;
    --border: #e0e0e0;
    --text: #1a1a1a;
    --muted: #6b7280;
    --accent: #2563eb;
    --stripe: #f9f9f9;
  }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }
  header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
  header h1 { font-size: 1.25rem; font-weight: 700; }
  header p { color: var(--muted); font-size: 12px; }
  nav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0.5rem 1.5rem; display: flex; gap: 1.25rem; flex-wrap: wrap; position: sticky; top: 0; z-index: 10; }
  nav a { color: var(--accent); text-decoration: none; font-size: 13px; white-space: nowrap; }
  nav a:hover { text-decoration: underline; }
  main { padding: 1.5rem; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 2.5rem; }
  section h2 { font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.6rem; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { padding: 0.5rem 0.85rem; text-align: left; font-weight: 600; color: var(--muted); font-size: 12px; border-bottom: 1px solid var(--border); white-space: nowrap; background: var(--surface); }
  td { padding: 0.45rem 0.85rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(odd) td { background: var(--stripe); }
  .no-data { color: var(--muted); font-style: italic; font-size: 13px; padding: 0.5rem 0; }
`.trim();

function buildHtml(generatedAt: string, sections: string[]): string {
  const navLinks = [
    ["#sleep", "Sleep"],
    ["#runs", "Runs"],
    ["#daily-stats", "Daily Stats"],
    ["#sport-activities", "Sport / Activities"],
    ["#macros", "Macros"],
    ["#food-log", "Food Log"],
    ["#workouts", "Workouts"],
  ]
    .map(([href, label]) => `<a href="${href}">${label}</a>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Health Dashboard</title>
  <style>${CSS}</style>
</head>
<body>
  <header>
    <h1>Health Dashboard</h1>
    <p>Generated ${generatedAt}</p>
  </header>
  <nav>${navLinks}</nav>
  <main>
    ${sections.join("\n")}
  </main>
</body>
</html>`;
}

export async function generateDashboard(telegramUserId: number): Promise<void> {
  const user = await ensureUser(telegramUserId);
  const uid = user.id;

  const [sleep, runs, dailyStats, sportActivities, macros, foodLogs, workouts] =
    await Promise.all([
      supabaseRequest<SleepRow[]>(
        `garmin_sleep_entries?select=sleep_date,sleep_duration_minutes,deep_sleep_minutes,light_sleep_minutes,rem_sleep_minutes,awake_duration_minutes,resting_heart_rate,body_battery_charge&user_id=eq.${uid}&order=sleep_date.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<RunRow[]>(
        `garmin_run_entries?select=run_date,avg_pace_sec_per_km,avg_speed_kmh,total_time_sec,avg_heart_rate_bpm,total_calories,aerobic_training_effect&user_id=eq.${uid}&order=run_date.desc,created_at.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<DailyStatsRow[]>(
        `garmin_daily_stats_entries?select=entry_date,steps,calories_burned,resting_bpm,high_bpm,body_battery_gained,body_battery_drained&user_id=eq.${uid}&order=entry_date.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<SportActivityRow[]>(
        `garmin_sport_activity_entries?select=activity_date,total_time_sec,avg_heart_rate_bpm,max_heart_rate_bpm,total_calories,aerobic_training_effect,total_intensity_minutes&user_id=eq.${uid}&order=activity_date.desc,created_at.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<MacrosRow[]>(
        `healthifyme_macros_entries?select=entry_date,consumed_calories,calorie_goal,protein_consumed_g,carbs_consumed_g,fats_consumed_g,fibre_consumed_g&user_id=eq.${uid}&order=entry_date.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<FoodLogRow[]>(
        `healthifyme_food_log_entries?select=entry_date,healthifyme_food_log_meals(meal_name,meal_calories)&user_id=eq.${uid}&order=entry_date.desc&limit=10`,
        { method: "GET" },
      ),
      supabaseRequest<WorkoutRow[]>(
        `hevy_workout_entries?select=workout_date,workout_name,duration_sec,total_volume_kg,exercise_count&user_id=eq.${uid}&order=workout_date.desc,created_at.desc&limit=10`,
        { method: "GET" },
      ),
    ]);

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = buildHtml(generatedAt, [
    sleepSection(sleep),
    runsSection(runs),
    dailyStatsSection(dailyStats),
    sportActivitiesSection(sportActivities),
    macrosSection(macros),
    foodLogSection(foodLogs),
    workoutsSection(workouts),
  ]);

  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, "index.html"), html, "utf8");
}
