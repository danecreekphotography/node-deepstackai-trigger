/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Trigger from "../../Trigger";
import IDeepStackPrediction from "../../types/IDeepStackPrediction";
import * as LocalStorageManager from "../../LocalStorageManager";
import PImage from "pureimage";
import * as fs from "fs";
import * as log from "../../Log";

export async function processTrigger(
  fileName: string,
  trigger: Trigger,
  predictions: IDeepStackPrediction[],
): Promise<void> {
  log.info("Annotations", `Annotating ${fileName}`);
  const outputFileName = LocalStorageManager.mapToLocalStorage(fileName);
  const font = PImage.registerFont("./fonts/CascadiaCode.ttf", "Cascadia Code");

  await font.load();

  const decodedImage = await PImage.decodeJPEGFromStream(fs.createReadStream(fileName));
  const context = decodedImage.getContext("2d");
  context.strokeStyle = "rgba(255,0,0,0.75)";
  context.fillStyle = "rgba(255,0,0,0.75)";
  context.font = "18pt Cascadia Code";
  context.fontBaseline = "top";

  predictions.map(prediction => {
    const width = prediction.x_max - prediction.x_min;
    const height = prediction.y_max - prediction.y_min;
    context.strokeRect(prediction.x_min, prediction.y_min, width, height);
    context.fillText(
      `${prediction.label} (${(prediction.confidence * 100).toFixed(0)}%)`,
      prediction.x_min + 10,
      prediction.y_min + 24,
    );
  });

  await PImage.encodeJPEGToStream(decodedImage, fs.createWriteStream(outputFileName), 75);
  log.info("Annotations", `Done annotating ${fileName}`);
}
