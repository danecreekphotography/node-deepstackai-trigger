/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as LocalStorageManager from "../../LocalStorageManager";
import * as log from "../../Log";
import * as mustacheFormatter from "../../MustacheFormatter";
import * as Settings from "../../Settings";

import IDeepStackPrediction from "../../types/IDeepStackPrediction";
import Trigger from "../../Trigger";
import PushbulletClient from "../../pushbulletClient/PushbulletClient";
import PushbulletMessage from "../../pushbulletClient/PushbulletMessage";

let _isEnabled = false;
let _pushClient: PushbulletClient;

// Tracks the last time each trigger fired, for use when calculating cooldown time windows
const _cooldowns = new Map<Trigger, Date>();

export async function initialize(): Promise<void> {
  if (!Settings.pushbullet) {
    log.info("Pushbullet", "No Pushbullet settings specified. Pushbullet is disabled.");
    return;
  }

  // The enabled setting is true by default
  _isEnabled = Settings.pushbullet.enabled ?? true;

  if (!_isEnabled) {
    log.info("Pushbullet", "Pushbullet is disabled via settings.");
    return;
  }

  _pushClient = new PushbulletClient({
    accessToken: Settings.pushbullet.accessToken,
  });

  log.info("Pushbullet", `Pushbullet enabled.`);
}

export async function processTrigger(
  fileName: string,
  trigger: Trigger,
  predictions: IDeepStackPrediction[],
): Promise<void[]> {
  if (!_isEnabled) {
    return;
  }

  // It's possible to not set up a Pushbullet handler on a trigger or to disable it, so don't
  // process if that's the case.
  if (!trigger?.pushbulletConfig?.enabled) {
    return;
  }

  // Don't send if within the cooldown time.
  if (!passesCooldownTime(fileName, trigger)) {
    return;
  }

  // Save the trigger's last fire time.
  _cooldowns.set(trigger, new Date());

  // Do mustache variable replacement if a custom caption was provided.
  const caption = trigger.pushbulletConfig.caption
    ? mustacheFormatter.format(trigger.pushbulletConfig.caption, fileName, trigger, predictions)
    : trigger.name;

  // Do mustache variable replacement if a custom title was provided.
  const title = trigger.pushbulletConfig.title
    ? mustacheFormatter.format(trigger.pushbulletConfig.title, fileName, trigger, predictions)
    : undefined;

  // Figure out the path to the file to send based on whether
  // annotated images were requested in the config.
  const imageFileName =
    trigger.pushbulletConfig.annotateImage && Settings.enableAnnotations
      ? LocalStorageManager.mapToLocalStorage(LocalStorageManager.Locations.Annotations, fileName)
      : fileName;

  // Build the Pushbullet message options.
  const pushbulletMessage = new PushbulletMessage({
    body: caption,
    imageFileName: imageFileName,
    title: title,
  });

  try {
    // This returns an array to keep it consistent with all the other managers.
    return [await sendPushbulletMessage(pushbulletMessage)];
  } catch (e) {
    log.warn("Pushbullet", `Unable to send message: ${e.error}`);
    return;
  }
}

/**
 * Sends a message to Pushbullet.
 * @param message The message to send
 */
async function sendPushbulletMessage(message: PushbulletMessage): Promise<void> {
  log.verbose("Pushbullet", `Sending message`);
  return await _pushClient.push(message);
}

/**
 * Checks to see if a trigger fired within the cooldown window
 * specified for the Pushbullet handler.
 * @param fileName The filename of the image that fired the trigger
 * @param trigger The trigger
 * @returns true if the trigger happened outside of the cooldown window
 */
function passesCooldownTime(fileName: string, trigger: Trigger): boolean {
  const lastTriggerTime = _cooldowns.get(trigger);

  // If this was never triggered then no cooldown applies.
  if (!lastTriggerTime) {
    return true;
  }

  // getTime() returns milliseconds so divide by 1000 to get seconds
  const secondsSinceLastTrigger = (trigger.receivedDate.getTime() - lastTriggerTime.getTime()) / 1000;

  if (secondsSinceLastTrigger < trigger.pushbulletConfig.cooldownTime) {
    log.verbose(
      `Pushbullet`,
      `${fileName}: Skipping sending message as the cooldown period of ${trigger.pushbulletConfig.cooldownTime} seconds hasn't expired.`,
    );
    return false;
  }

  return true;
}
