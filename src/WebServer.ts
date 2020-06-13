/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import express from "express";
import * as log from "./Log";
import * as LocalStorageManager from "./LocalStorageManager";

const app = express();
const port = 4242;

export function startApp(): void {
  app.use("/", express.static(LocalStorageManager.localStoragePath));
  try {
    app.listen(port, () => log.info("Web server", `Listening at http://localhost:${port}`));
  } catch (e) {
    log.warn("Web server", `Unable to start web server: ${e.error}`);
  }
}
