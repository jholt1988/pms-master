export function freezeTime(iso = '2026-01-01T00:00:00.000Z'): Date {
  const fixed = new Date(iso);
  jest.useFakeTimers();
  jest.setSystemTime(fixed);
  return fixed;
}

export function restoreTime(): void {
  jest.useRealTimers();
}

export function setDeterministicRandom(seed = 0.42): void {
  jest.spyOn(Math, 'random').mockReturnValue(seed);
}

export function restoreRandom(): void {
  const randomMock = Math.random as unknown as { mockRestore?: () => void };
  randomMock.mockRestore?.();
}
