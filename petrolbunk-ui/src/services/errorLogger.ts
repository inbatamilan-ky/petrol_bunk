/**
 * src/services/errorLogger.ts
 *
 * Centralized Error Logging Service for FuelPulse SaaS.
 * Captures all runtime, API, component, and validation errors quietly into
 * structured logs instead of exposing intrusive red error alerts to users.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ErrorLogLevel = 'error' | 'warn' | 'info';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  isoDate: string;
  level: ErrorLogLevel;
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'fuelpulse_error_logs_v1';
const MAX_LOGS = 150;

let _logs: ErrorLogEntry[] = [];
let _listeners: Set<(logs: ErrorLogEntry[]) => void> = new Set();
let _isInitialized = false;

function formatTimestamp(d: Date): string {
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  return `${time} · ${date}`;
}

async function loadPersistedLogs(): Promise<void> {
  if (_isInitialized) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        _logs = JSON.parse(stored);
      }
    } else {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        _logs = JSON.parse(stored);
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  _isInitialized = true;
}

function persistLogs(): void {
  try {
    const serialized = JSON.stringify(_logs.slice(0, MAX_LOGS));
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
    AsyncStorage.setItem(STORAGE_KEY, serialized).catch(() => {});
  } catch {}
}

function notifyListeners(): void {
  const currentLogs = [..._logs];
  _listeners.forEach((listener) => {
    try {
      listener(currentLogs);
    } catch {}
  });
}

/**
 * Add a structured error log entry.
 */
export function logError(
  source: string,
  error: unknown,
  metadata?: Record<string, any>
): ErrorLogEntry {
  const now = new Date();
  let message = 'Unknown error occurred';
  let stack: string | undefined = undefined;

  if (error instanceof Error) {
    message = error.message || String(error);
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = (error as any).message || JSON.stringify(error);
    stack = (error as any).stack;
  }

  const entry: ErrorLogEntry = {
    id: `err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: formatTimestamp(now),
    isoDate: now.toISOString(),
    level: 'error',
    source: source || 'Application',
    message,
    stack,
    metadata,
  };

  _logs.unshift(entry);
  if (_logs.length > MAX_LOGS) {
    _logs = _logs.slice(0, MAX_LOGS);
  }

  persistLogs();
  notifyListeners();

  // Also print a clean grouped log to developer console without throwing
  if (typeof console !== 'undefined') {
    console.warn(`[ErrorLog] [${entry.source}] ${entry.message}`, { entry, metadata });
  }

  return entry;
}

/**
 * Log a warning event.
 */
export function logWarning(
  source: string,
  message: string,
  metadata?: Record<string, any>
): ErrorLogEntry {
  const now = new Date();
  const entry: ErrorLogEntry = {
    id: `warn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: formatTimestamp(now),
    isoDate: now.toISOString(),
    level: 'warn',
    source: source || 'Application',
    message,
    metadata,
  };

  _logs.unshift(entry);
  if (_logs.length > MAX_LOGS) {
    _logs = _logs.slice(0, MAX_LOGS);
  }

  persistLogs();
  notifyListeners();
  return entry;
}

/**
 * Log an informational event.
 */
export function logInfo(
  source: string,
  message: string,
  metadata?: Record<string, any>
): ErrorLogEntry {
  const now = new Date();
  const entry: ErrorLogEntry = {
    id: `info-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: formatTimestamp(now),
    isoDate: now.toISOString(),
    level: 'info',
    source: source || 'System',
    message,
    metadata,
  };

  _logs.unshift(entry);
  if (_logs.length > MAX_LOGS) {
    _logs = _logs.slice(0, MAX_LOGS);
  }

  persistLogs();
  notifyListeners();
  return entry;
}

/**
 * Return current in-memory error logs.
 */
export function getErrorLogs(): ErrorLogEntry[] {
  return [..._logs];
}

/**
 * Clear all logged errors.
 */
export function clearErrorLogs(): void {
  _logs = [];
  persistLogs();
  notifyListeners();
}

/**
 * Subscribe to real-time error log changes.
 */
export function subscribeErrorLogs(listener: (logs: ErrorLogEntry[]) => void): () => void {
  _listeners.add(listener);
  listener([..._logs]);
  return () => {
    _listeners.delete(listener);
  };
}

/**
 * Safe Synchronous Try-Catch utility: Executes `fn`, logs any error to ErrorLogger,
 * and safely returns fallback value without crashing the UI.
 */
export function safeTry<T>(fn: () => T, fallback: T, source = 'SafeBlock'): T {
  try {
    return fn();
  } catch (err) {
    logError(source, err);
    return fallback;
  }
}

/**
 * Safe Asynchronous Try-Catch utility: Executes async `fn`, logs any error to ErrorLogger,
 * and safely returns fallback value without crashing the UI.
 */
export async function safeTryAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  source = 'SafeAsyncBlock'
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logError(source, err);
    return fallback;
  }
}

// ─── Attach Global Error Handlers & Dev Console Helpers ────────────────────────
if (typeof window !== 'undefined') {
  loadPersistedLogs();

  (window as any).__FUELPULSE_ERROR_LOGS__ = _logs;
  (window as any).getLogs = () => getErrorLogs();
  (window as any).showLogs = () => {
    const l = getErrorLogs();
    if (console.table) {
      console.table(l.map((x) => ({ timestamp: x.timestamp, level: x.level, source: x.source, message: x.message })));
    } else {
      console.log(l);
    }
    return l;
  };
  (window as any).clearLogs = () => {
    clearErrorLogs();
    console.log('[ErrorLog] All logs cleared.');
  };

  window.addEventListener('error', (event) => {
    logError('Window Runtime', event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError('Unhandled Promise', event.reason || 'Unhandled Promise Rejection');
  });
}
