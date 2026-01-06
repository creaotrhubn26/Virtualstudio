/**
 * Logger Service
 * Provides logging functionality with module namespacing
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerModule {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

class Logger {
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  module(name: string): LoggerModule {
    return {
      debug: (...args: unknown[]) => this.log('debug', name, ...args),
      info: (...args: unknown[]) => this.log('info', name, ...args),
      warn: (...args: unknown[]) => this.log('warn', name, ...args),
      error: (...args: unknown[]) => this.log('error', name, ...args),
    };
  }

  private log(level: LogLevel, module: string, ...args: unknown[]): void {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.level)) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }
}

export const logger = new Logger();

