type UserState = {
  userId: number;
  date?: string;
  screenshotType?: string;
  awaitingImage?: boolean;
};

const stateStore = new Map<number, UserState>();

export function getState(userId: number): UserState {
  if (!stateStore.has(userId)) {
    stateStore.set(userId, { userId });
  }

  return stateStore.get(userId)!;
}

export function updateState(userId: number, updates: Partial<UserState>) {
  const current = getState(userId);

  stateStore.set(userId, {
    ...current,
    ...updates,
  });
}

export function resetState(userId: number) {
  stateStore.delete(userId);
}
