import { BadRequestException, ValidationError } from '@nestjs/common';
import { translateValidationConstraint } from '../i18n/operator-error-messages';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const constraint of Object.values(error.constraints)) {
        messages.push(translateValidationConstraint(path, constraint));
      }
    }

    if (error.children && error.children.length > 0) {
      messages.push(...flattenValidationErrors(error.children, path));
    }
  }

  return messages;
}

/**
 * Nest ValidationPipe exceptionFactory — always returns Uzbek operator messages.
 * Prefer one clear message per field to avoid noisy multi-constraint dumps.
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const messages = flattenValidationErrors(errors);
  const unique = Array.from(new Set(messages));

  // One message per field label prefix ("Miqdor: ...")
  const byField = new Map<string, string>();
  for (const item of unique) {
    const colon = item.indexOf(':');
    const key = colon > 0 ? item.slice(0, colon) : item;
    if (!byField.has(key)) {
      byField.set(key, item);
    }
  }
  const compact = Array.from(byField.values());

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message:
      compact.length === 1
        ? compact[0]
        : compact.length > 0
          ? compact
          : 'Kiritilgan ma’lumotlar noto‘g‘ri.',
  });
}
