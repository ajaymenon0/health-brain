import { Context, Scenes } from "telegraf";

export interface WizardSession extends Scenes.WizardSessionData {
  date?: string;
  screenshotType?: string;
}

export interface BotContext extends Scenes.WizardContext<WizardSession> {
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  session: Scenes.WizardSession<WizardSession>;
}
