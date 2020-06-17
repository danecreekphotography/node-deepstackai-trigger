/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Neil Enns. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import IMqttManagerConfigJson from "../handlers/mqttManager/IMqttManagerConfigJson";
import ITelegramManagerConfigJson from "../handlers/telegramManager/ITelegramManagerConfigJson";
import IPushoverManagerConfigJson from "../handlers/pushoverManager/IPushoverManagerConfigJson";

export default interface ISettingsConfigJson {
  mqtt: IMqttManagerConfigJson;
  telegram: ITelegramManagerConfigJson;
  pushover: IPushoverManagerConfigJson;
}
