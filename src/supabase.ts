import config from "./config";

type UserRow = {
  id: string;
  telegram_user_id: number;
};

function requireSupabaseConfig() {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase.",
    );
  }

  return {
    url: config.supabase.url,
    serviceRoleKey: config.supabase.serviceRoleKey,
  };
}

export async function supabaseRequest<T>(
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

export async function ensureUser(telegramUserId: number): Promise<UserRow> {
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

export function toIsoDate(value: string): string {
  if (!/^\d{8}$/.test(value)) {
    throw new Error(`Expected date in ddmmyyyy format, received "${value}".`);
  }

  const dd = value.slice(0, 2);
  const mm = value.slice(2, 4);
  const yyyy = value.slice(4, 8);

  return `${yyyy}-${mm}-${dd}`;
}
