/**
 * @fileoverview Functional programming utilities for atomic operations
 * 
 * This module provides functional programming utilities that promote
 * immutability, pure functions, and atomic operations throughout the codebase.
 * 
 * @author Code Critics Team
 * @version 1.0.0
 */

/**
 * Result type for operations that can succeed or fail
 * Provides a functional approach to error handling without exceptions
 */
export type Result<T, E = Error> =
  | { success: true; data: T; }
  | { success: false; error: E; };

/**
 * Option type for values that may or may not exist
 * Provides a functional approach to handling nullable values
 */
export type Option<T> =
  | { some: true; value: T; }
  | { some: false; };

/**
 * Creates a successful Result
 * 
 * @param data - The successful data
 * @returns Result with success state
 */
export const success = <T>(data: T): Result<T> => ({ success: true, data });

/**
 * Creates a failed Result
 * 
 * @param error - The error that occurred
 * @returns Result with error state
 */
export const failure = <E = Error>(error: E): Result<never, E> => ({ success: false, error });

/**
 * Creates a Some Option
 * 
 * @param value - The value to wrap
 * @returns Option with value
 */
export const some = <T>(value: T): Option<T> => ({ some: true, value });

/**
 * Creates a None Option
 * 
 * @returns Option with no value
 */
export const none = <T>(): Option<T> => ({ some: false });

/**
 * Maps over a Result, transforming the success value
 * 
 * @param result - The Result to map over
 * @param fn - Function to transform the success value
 * @returns New Result with transformed value or original error
 */
export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return result.success ? { success: true, data: fn(result.data) } : { success: false, error: result.error };
};

/**
 * Chains Result operations together
 * 
 * @param result - The Result to chain from
 * @param fn - Function that returns a new Result
 * @returns New Result from the function or original error
 */
export const chainResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return result.success ? fn(result.data) : result;
};

/**
 * Maps over an Option, transforming the value if present
 * 
 * @param option - The Option to map over
 * @param fn - Function to transform the value
 * @returns New Option with transformed value or None
 */
export const mapOption = <T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> => {
  return option.some ? some(fn(option.value)) : none();
};

/**
 * Gets the value from an Option or returns a default
 * 
 * @param option - The Option to get value from
 * @param defaultValue - Default value if Option is None
 * @returns The value or default
 */
export const getOrElse = <T>(option: Option<T>, defaultValue: T): T => {
  return option.some ? option.value : defaultValue;
};

/**
 * Safely executes a function that might throw, returning a Result
 * 
 * @param fn - Function to execute safely
 * @returns Result with function result or error
 */
export const tryCatch = <T>(fn: () => T): Result<T> => {
  try {
    return success(fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Safely executes an async function that might throw, returning a Result
 * 
 * @param fn - Async function to execute safely
 * @returns Promise of Result with function result or error
 */
export const tryCatchAsync = async <T>(fn: () => Promise<T>): Promise<Result<T>> => {
  try {
    const result = await fn();
    return success(result);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Pipes a value through a series of transformation functions
 * 
 * @param value - Initial value
 * @param fns - Array of transformation functions
 * @returns Final transformed value
 */
export const pipe = <T>(value: T, ...fns: Array<(arg: T) => T>): T => {
  return fns.reduce((acc, fn) => fn(acc), value);
};

/**
 * Composes functions from right to left
 * 
 * @param fns - Functions to compose
 * @returns Composed function
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => {
  return (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value);
};

/**
 * Curries a function, allowing partial application
 * 
 * @param fn - Function to curry
 * @returns Curried function
 */
export const curry = <A, B, C>(fn: (a: A, b: B) => C) => {
  return (a: A) => (b: B) => fn(a, b);
};

/**
 * Validates a value against a predicate, returning a Result
 * 
 * @param value - Value to validate
 * @param predicate - Validation predicate
 * @param errorMessage - Error message if validation fails
 * @returns Result with value if valid, error if invalid
 */
export const validate = <T>(
  value: T,
  predicate: (value: T) => boolean,
  errorMessage: string
): Result<T> => {
  return predicate(value) ? success(value) : failure(new Error(errorMessage));
};

/**
 * Debounces a function, ensuring it's only called after a delay
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttles a function, ensuring it's only called at most once per interval
 * 
 * @param fn - Function to throttle
 * @param interval - Interval in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * Memoizes a function, caching results for repeated calls
 * 
 * @param fn - Function to memoize
 * @returns Memoized function
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}; 