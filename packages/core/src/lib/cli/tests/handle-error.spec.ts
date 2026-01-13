import { describe, expect, it } from 'vitest';
import { InvalidPathError } from '../../error/user-error';
import { mockCli } from './helpers/mock-cli';
import { handleError, handleErrorAsync } from '../internal/handle-error';

describe('with error handling', () => {
  it('should execute the function', () => {
    mockCli();
    let a = 1;

    handleError(() => a++);

    expect(a).toBe(2);
  });

  it('should print out the message of an UserError', () => {
    const { allErrorLogs } = mockCli();
    handleError(() => {
      throw new InvalidPathError('sheriff', 'src/main.ts');
    });

    expect(allErrorLogs()).toBe(
      'invalid path mapping detected: sheriff: src/main.ts. Please verify that the path exists.',
    );
  });

  it('should print out the message of an Error', () => {
    const { allErrorLogs } = mockCli();
    handleError(() => {
      throw new Error('nix geht');
    });

    expect(allErrorLogs()).toBe('nix geht');
  });

  it('should print out the just the error if not of type Error', () => {
    const { allErrorLogs } = mockCli();

    handleError(() => {
      throw 'nix geht';
    });

    expect(allErrorLogs()).toBe('nix geht');
  });
});

describe('handleErrorAsync', () => {
  it('should execute the async function', async () => {
    mockCli();
    let a = 1;

    await handleErrorAsync(async () => {
      a++;
    });

    expect(a).toBe(2);
  });

  it('should print out the message of an UserError', async () => {
    const { allErrorLogs } = mockCli();
    await handleErrorAsync(async () => {
      throw new InvalidPathError('sheriff', 'src/main.ts');
    });

    expect(allErrorLogs()).toBe(
      'invalid path mapping detected: sheriff: src/main.ts. Please verify that the path exists.',
    );
  });

  it('should print out the message of an Error', async () => {
    const { allErrorLogs } = mockCli();
    await handleErrorAsync(async () => {
      throw new Error('async error');
    });

    expect(allErrorLogs()).toBe('async error');
  });

  it('should print out the just the error if not of type Error', async () => {
    const { allErrorLogs } = mockCli();

    await handleErrorAsync(async () => {
      throw 'async string error';
    });

    expect(allErrorLogs()).toBe('async string error');
  });

  it('should handle rejected promises', async () => {
    const { allErrorLogs } = mockCli();

    await handleErrorAsync(() => Promise.reject(new Error('rejected promise')));

    expect(allErrorLogs()).toBe('rejected promise');
  });
});
