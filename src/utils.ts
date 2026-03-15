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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatLabel(value: string): string {
  return value
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

function formatTableRows(entries: Array<[string, unknown]>): string {
  const labels = entries.map(([key]) => formatLabel(key));
  const width = labels.reduce((max, label) => Math.max(max, label.length), 0);

  return entries
    .map(([key, value], index) => {
      const label =
        labels[index]?.padEnd(width, " ") ||
        formatLabel(key).padEnd(width, " ");
      return `${escapeHtml(label)} | ${escapeHtml(formatScalar(value))}`;
    })
    .join("\n");
}

function formatObjectSection(
  title: string,
  value: Record<string, unknown>,
): string {
  const entries = Object.entries(value);
  const scalarEntries = entries.filter(
    ([, entryValue]) =>
      !isPlainObject(entryValue) && !Array.isArray(entryValue),
  );
  const nestedEntries = entries.filter(
    ([, entryValue]) => isPlainObject(entryValue) || Array.isArray(entryValue),
  );
  const sections: string[] = [`<b>${escapeHtml(formatLabel(title))}</b>`];

  if (scalarEntries.length > 0) {
    sections.push(`<pre>${formatTableRows(scalarEntries)}</pre>`);
  }

  for (const [nestedKey, nestedValue] of nestedEntries) {
    if (isPlainObject(nestedValue)) {
      sections.push(formatObjectSection(nestedKey, nestedValue));
      continue;
    }

    if (Array.isArray(nestedValue)) {
      sections.push(formatArraySection(nestedKey, nestedValue));
    }
  }

  return sections.join("\n");
}

function formatArraySection(title: string, values: unknown[]): string {
  const sections: string[] = [`<b>${escapeHtml(formatLabel(title))}</b>`];

  values.forEach((item, index) => {
    const itemTitle = `${formatLabel(title)} ${index + 1}`;

    if (isPlainObject(item)) {
      sections.push(formatObjectSection(itemTitle, item));
      return;
    }

    sections.push(
      `<pre>${escapeHtml(itemTitle)} | ${escapeHtml(formatScalar(item))}</pre>`,
    );
  });

  return sections.join("\n");
}

export function formatParsedScreenshot(result: string): string {
  const parsed = JSON.parse(result) as unknown;

  if (!isPlainObject(parsed)) {
    return `<pre>${escapeHtml(result)}</pre>`;
  }

  const entries = Object.entries(parsed);
  const scalarEntries = entries.filter(
    ([, value]) => !isPlainObject(value) && !Array.isArray(value),
  );
  const nestedEntries = entries.filter(
    ([, value]) => isPlainObject(value) || Array.isArray(value),
  );
  const sections = ["<b>Parsed Screenshot Data</b>"];

  if (scalarEntries.length > 0) {
    sections.push(`<pre>${formatTableRows(scalarEntries)}</pre>`);
  }

  for (const [key, value] of nestedEntries) {
    if (isPlainObject(value)) {
      sections.push(formatObjectSection(key, value));
      continue;
    }

    if (Array.isArray(value)) {
      sections.push(formatArraySection(key, value));
    }
  }

  return sections.join("\n\n");
}
