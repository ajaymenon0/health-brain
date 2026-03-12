import { Scenes } from "telegraf";
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
}

export interface BotContext extends Scenes.WizardContext<WizardSession> {
  scene: Scenes.SceneContextScene<BotContext, WizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  session: Scenes.WizardSession<WizardSession>;
}
