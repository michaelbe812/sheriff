import { UserError } from '../../error/user-error';
import { cli } from '../cli';

/**
 * Outputs the error message to stderr.
 * Handles UserError, Error, and other types appropriately.
 *
 * @param error The error to output
 */
export function handleErrorOutput(error: unknown): void {
  if (error instanceof UserError) {
    cli.logError(error.message);
  } else if (error instanceof Error) {
    cli.logError(error.message);
  } else {
    cli.logError(String(error));
  }
}

/**
 * Catches Error for the CLI and prints `UserError` in
 * UI-friendly way. Everything else as it is.
 *
 * @param fn which should be 'error-handled'
 */
export function handleError(fn: () => void) {
  try {
    fn();
    cli.endProcessOk();
  } catch (error) {
    handleErrorOutput(error);
    cli.endProcessError();
  }
}

/**
 * Async version of handleError for plugin execution.
 * Catches errors from async functions and prints them in a UI-friendly way.
 *
 * @param fn Async function which should be 'error-handled'
 */
export async function handleErrorAsync(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    cli.endProcessOk();
  } catch (error) {
    handleErrorOutput(error);
    cli.endProcessError();
  }
}
