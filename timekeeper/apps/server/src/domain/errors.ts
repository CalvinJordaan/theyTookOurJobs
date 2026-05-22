export type ErrorCode =
  | 'validation'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'running_timer_conflict'
  | 'approval_locked'
  | 'internal';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusFor(code);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

function statusFor(code: ErrorCode): number {
  switch (code) {
    case 'validation': return 400;
    case 'not_found': return 404;
    case 'forbidden': return 403;
    case 'conflict':
    case 'running_timer_conflict':
    case 'approval_locked': return 409;
    default: return 500;
  }
}

export function notFound(entity: string, id: unknown): AppError {
  return new AppError('not_found', `${entity} ${id} not found`);
}

export function forbidden(reason: string): AppError {
  return new AppError('forbidden', reason);
}

export function conflict(reason: string): AppError {
  return new AppError('conflict', reason);
}

export function approvalLocked(): AppError {
  return new AppError('approval_locked', 'Cannot modify an approved time entry');
}
