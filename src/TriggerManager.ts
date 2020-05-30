/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as JSONC from "jsonc-parser";
import * as log from "./Log";
import ITriggerConfigJson from "./types/ITriggerConfigJson";
import MqttConfig from "./handlers/mqttManager/MqttConfig";
import TelegramConfig from "./handlers/telegramManager/TelegramConfig";
import Trigger from "./Trigger";
import triggerSchema from "./schemas/triggerConfiguration.schema.json";
import validateJsonAgainstSchema from "./schemaValidator";
import WebRequestConfig from "./handlers/webRequest/WebRequestConfig";
import { promises as fsPromise } from "fs";
import Rect from "./Rect";

let _triggers: Trigger[];

/**
 * Loads a trigger configuration file
 * @param configFilePath The path to the configuration file
 * @returns The unvalidated raw JSON
 */
async function loadConfigurationFile(configFilePath: string): Promise<string> {
  if (!configFilePath) {
    throw new Error(
      `[Trigger Manager] No configuration file was specified. Make sure the trigger secret in the docker-compose.yaml points to a configuration file.`,
    );
  }

  const rawConfig: string = await fsPromise.readFile(configFilePath, "utf-8").catch(e => {
    throw new Error(`[Trigger Manager] Unable to load configuration file ${configFilePath}: ${e.message}`);
  });

  if (!rawConfig) {
    throw new Error(`[Trigger Manager] Unable to load configuration file ${configFilePath}.`);
  }

  return rawConfig;
}

/**
 * Takes a raw JSON string and converts it to an ITriggerConfigJson
 * @param rawConfig The raw JSON in a string
 * @returns An ITriggerConfigJson from the parsed JSON
 */
function parseConfigFile(rawConfig: string): ITriggerConfigJson {
  let parseErrors: JSONC.ParseError[];

  const triggerConfig = JSONC.parse(rawConfig, parseErrors) as ITriggerConfigJson;

  // This extra level of validation really shouldn't be necessary since the
  // file passed schema validation. Still, better safe than crashy.
  if (parseErrors && parseErrors.length > 0) {
    throw new Error(
      `[Trigger Manager] Unable to load configuration file: ${parseErrors
        .map(error => log.error("Trigger manager", `${error?.error}`))
        .join("\n")}`,
    );
  }

  return triggerConfig;
}

/**
 * Takes a path to a configuration file and loads all of the triggers from it.
 * @param configFilePath The path to the configuration file
 */
export async function loadTriggers(configFilePath: string): Promise<void> {
  const rawConfig = await loadConfigurationFile(configFilePath);
  const triggerConfigJson = parseConfigFile(rawConfig);

  if (!(await validateJsonAgainstSchema(triggerSchema, triggerConfigJson))) {
    throw new Error("[Trigger Manager] Invalid configuration file.");
  }

  log.info("Trigger manager", `Loaded configuration from ${configFilePath}`);

  _triggers = triggerConfigJson.triggers.map(triggerJson => {
    log.info("Trigger manager", `Loaded configuration for ${triggerJson.name}`);
    const configuredTrigger = new Trigger({
      cooldownTime: triggerJson.cooldownTime,
      enabled: triggerJson.enabled ?? true, // If it isn't specified then enable the camera
      name: triggerJson.name,
      threshold: {
        minimum: triggerJson?.threshold?.minimum ?? 0, // If it isn't specified then just assume always trigger.
        maximum: triggerJson?.threshold?.maximum ?? 100, // If it isn't specified then just assume always trigger.
      },
      watchPattern: triggerJson.watchPattern,
      watchObjects: triggerJson.watchObjects,
    });

    // Set up the masks as real objects
    configuredTrigger.masks = triggerJson.masks?.map(
      mask => new Rect(mask.xMinimum, mask.yMinimum, mask.xMaximum, mask.yMaximum),
    );

    // Set up the handlers
    if (triggerJson.handlers.webRequest) {
      configuredTrigger.webRequestHandlerConfig = new WebRequestConfig(triggerJson.handlers.webRequest);
    }
    if (triggerJson.handlers.mqtt) {
      configuredTrigger.mqttConfig = new MqttConfig(triggerJson.handlers.mqtt);
    }
    if (triggerJson.handlers.telegram) {
      configuredTrigger.telegramConfig = new TelegramConfig(triggerJson.handlers.telegram);
    }

    return configuredTrigger;
  });
}

/**
 * Start all registered triggers watching for changes.
 */
export function startWatching(): void {
  _triggers.map(trigger => trigger.startWatching());
}

/**
 * Stops all registered triggers from watching for changes.
 */
export async function stopWatching(): Promise<void[]> {
  return Promise.all(_triggers.map(trigger => trigger.stopWatching()));
}
