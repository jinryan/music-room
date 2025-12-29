/**
 * Simple logger utility - can be disabled for production
 */

let enabled = false;

export function setLoggingEnabled(value: boolean): void {
  enabled = value;
}

export function log(module: string, message: string, ...args: unknown[]): void {
  if (enabled) {
    console.log(`[${module}] ${message}`, ...args);
  }
}

export function warn(module: string, message: string, ...args: unknown[]): void {
  if (enabled) {
    console.warn(`[${module}] ${message}`, ...args);
  }
}

