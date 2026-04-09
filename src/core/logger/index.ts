type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
  tags?: string[];
}

// Fields that should never appear in logs
const PII_FIELDS = [
  'access_token',
  'refresh_token',
  'password',
  'email',
  'phone',
  'ssn',
  'credit_card',
  'authorization',
  'cookie',
];

const SENSITIVE_PATTERNS = [
  /Bearer\s+[^\s]+/gi,
  /token["']?\s*[:=]\s*["']?[^"',}]+/gi,
];

function stripSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    if (PII_FIELDS.some(pii => lowerKey.includes(pii))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = stripSensitiveData(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}

function stripSensitiveStrings(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

function shouldLogInProduction(level: LogLevel): boolean {
  return level === 'error' || level === 'warn';
}

function createLogEntry(level: LogLevel, message: string, data?: Record<string, unknown>, tags?: string[]): LogEntry {
  return {
    level,
    timestamp: new Date().toISOString(),
    message: stripSensitiveStrings(message),
    data: data ? stripSensitiveData(data) : undefined,
    tags,
  };
}

function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  const tagsStr = entry.tags?.length ? ` [${entry.tags.join(', ')}]` : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}${tagsStr}: ${entry.message}${dataStr}`;
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>, tags?: string[]) => {
    if (__DEV__) {
      console.debug(formatLogEntry(createLogEntry('debug', message, data, tags)));
    }
  },

  info: (message: string, data?: Record<string, unknown>, tags?: string[]) => {
    if (__DEV__) {
      console.info(formatLogEntry(createLogEntry('info', message, data, tags)));
    }
  },

  warn: (message: string, data?: Record<string, unknown>, tags?: string[]) => {
    if (__DEV__ || shouldLogInProduction('warn')) {
      console.warn(formatLogEntry(createLogEntry('warn', message, data, tags)));
    }
  },

  error: (message: string, data?: Record<string, unknown>, tags?: string[]) => {
    console.log(formatLogEntry(createLogEntry('error', message, data, tags)));
  },

  sanitize: (message: string, data?: Record<string, unknown>): LogEntry => {
    return createLogEntry('info', message, data);
  },
};

export type { LogEntry, LogLevel };
