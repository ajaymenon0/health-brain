import { Scenes } from "telegraf";

export interface WizardSession extends Scenes.WizardSessionData {
  date?: string | undefined;
  expectsCustomDate?: boolean;
  photoFileId?: string;
}

export interface BotContext extends Scenes.WizardContext<WizardSession> {
  scene: Scenes.SceneContextScene<BotContext, WizardSession>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  session: Scenes.WizardSession<WizardSession>;
}
