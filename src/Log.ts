/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// whole point of having this file: to wrap console.log calls.
// Everywhere else console.log() is a build breaking error to prevent
// accidental use of it.
/* eslint-disable no-console */
import chalk from "chalk";
import moment from "moment";

const isVerbose = process.env.VERBOSE ?? false;

/**
 * Formats a message for output to the logs.
 * @param source The source of the message
 * @param message The message
 */
function formatMessage(source: string, message: string) {
  return `${moment().format()} [${source}] ${message}`;
}

/**
 * Logs an informational message to the console.
 * @param source The source of the message
 * @param message The message
 */
export function info(source: string, message: string): void {
  console.log(formatMessage(source, message));
}

/**
 * Logs a verbose message to the console. Logs nothing if VERBOSE isn't set.
 * @param source The source of the message
 * @param message The message
 */
export function verbose(source: string, message: string): void {
  if (!isVerbose) {
    return;
  }

  console.log(formatMessage(source, message));
}

/**
 * Logs a warning message to the console.
 * @param source The source of the message
 * @param message The message
 */
export function warn(source: string, message: string): void {
  console.log(chalk.yellow(formatMessage(source, message)));
}

/**
 * Logs an error message to the console.
 * @param source The source of the message
 * @param message The message
 */
export function error(source: string, message: string): void {
  console.log(chalk.red(formatMessage(source, message)));
}
