/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as JSONC from "jsonc-parser";
import * as fs from "fs";
import * as log from "./Log";

export function readSettings<T>(serviceName: string, settingsFileName: string): T {
  let rawConfig: string;
  try {
    rawConfig = fs.readFileSync(settingsFileName, "utf-8");
  } catch (e) {
    log.warn(serviceName, `Unable to read the configuration file: ${e.message}.`);
    return null;
  }

  // This shouldn't happen. Keeping the check here in case it does in the real world
  // and someone reports things not working.
  if (!rawConfig) {
    throw new Error(`[${serviceName}] Unable to load configuration file ${settingsFileName}.`);
  }

  let parseErrors: JSONC.ParseError[];

  const settings = JSONC.parse(rawConfig, parseErrors) as T;

  // This extra level of validation really shouldn't be necessary since the
  // file passed schema validation. Still, better safe than crashing.
  if (parseErrors && parseErrors.length > 0) {
    throw new Error(
      `[${serviceName}] Unable to load configuration file: ${parseErrors
        .map(error => log.error("${serviceName}", `${error?.error}`))
        .join("\n")}`,
    );
  }

  return settings;
}
