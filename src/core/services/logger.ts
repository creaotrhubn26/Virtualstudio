type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerModule {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const createLoggerModule = (moduleName: string): LoggerModule => {
  const log = (level: LogLevel, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${moduleName}]`;
    
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
  };

  return {
    debug: (...args: unknown[]) => log('debug', ...args),
    info: (...args: unknown[]) => log('info', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
  };
};

export const logger = {
  module: (name: string): LoggerModule => createLoggerModule(name),
  debug: (...args: unknown[]) => createLoggerModule('App').debug(...args),
  info: (...args: unknown[]) => createLoggerModule('App').info(...args),
  warn: (...args: unknown[]) => createLoggerModule('App').warn(...args),
  error: (...args: unknown[]) => createLoggerModule('App').error(...args),
};
