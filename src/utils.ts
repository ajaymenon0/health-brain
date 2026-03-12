import { DATE_CHOICES, SCREENSHOT_TYPE_CHOICES } from "./enums";
import type { DateChoice, ScreenshotType } from "./types";

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}${mm}${yyyy}`;
}

export function isDateChoice(value: string): value is DateChoice {
  return DATE_CHOICES.has(value as DateChoice);
}

export function isScreenshotType(value: string): value is ScreenshotType {
  return SCREENSHOT_TYPE_CHOICES.has(value as ScreenshotType);
}
