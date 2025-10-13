type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

let currentLevel: LogLevel = "warn";

export function setLogLevel(level?: string | null): void {
  if (!level) return;
  const normalized = level.toLowerCase() as LogLevel;
  if (normalized in LEVEL_PRIORITY) {
    currentLevel = normalized;
  }
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[currentLevel];
}

export const logger = {
  debug(...args: unknown[]) {
    if (shouldLog("debug")) {
      console.debug(...args);
    }
  },
  info(...args: unknown[]) {
    if (shouldLog("info")) {
      console.info(...args);
    }
  },
  warn(...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(...args);
    }
  },
  error(...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(...args);
    }
  }
};

export function getLogLevel(): LogLevel {
  return currentLevel;
}

