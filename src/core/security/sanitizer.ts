import { logger } from '@core/logger';

const HTML_TAG_REGEX = /<[^>]*>/g;
const DANGEROUS_URI_REGEX = /(javascript|data|vbscript)\s*:/gi;

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    logger.warn('SanitizeInput received non-string type');
    return '';
  }

  let sanitized = input.trim();

  sanitized = sanitized.replace(HTML_TAG_REGEX, '');

  sanitized = sanitized.replace(DANGEROUS_URI_REGEX, '[SANITIZED_URI]');

  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return sanitized;
}

export function isInputSafe(input: string): boolean {
  const hasTags = HTML_TAG_REGEX.test(input);
  const hasDangerousUris = DANGEROUS_URI_REGEX.test(input);

  return !hasTags && !hasDangerousUris;
}
