export class AppError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export function getErrorColor(code?: string): string {
  if (!code) return 'text-gray-400';
  if (code.startsWith('4')) return 'text-yellow-400';
  if (code.startsWith('5')) return 'text-red-400';
  return 'text-gray-400';
}
