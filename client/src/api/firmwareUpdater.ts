import { DeviceType, StableFormData, StableFormDataOnlyFirmware, StableFormDataOnlySettings } from '@interface/core.ts';
import axios from 'axios';
import { FIRMWARE_UPDATER_FULL_URL, FIRMWARE_UPDATER_ONLY_FIRMWARE_URL, FIRMWARE_UPDATER_ONLY_SETTINGS_URL } from '@api/constant.ts';

type Data = { downloadUrl: string };
export type FirmwareUpdaterResponse = { error: null; data: Data; isSuccess?: undefined } | { error: any; isSuccess: boolean; data?: undefined };

export async function firmwareUpdaterFull(data: StableFormData, deviceType: DeviceType, idToken: string): Promise<FirmwareUpdaterResponse> {
  try {
    const res = await axios.post(FIRMWARE_UPDATER_FULL_URL, { ...data, deviceType }, { headers: { 'Content-Type': 'application/json', Authorization: idToken } });
    console.log(res);
    return { error: null, data: res.data };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', isSuccess: false };
  }
}

export async function firmwareUpdaterOnlySettings(data: StableFormDataOnlySettings, deviceType: DeviceType, idToken: string): Promise<FirmwareUpdaterResponse> {
  try {
    const res = await axios.post(FIRMWARE_UPDATER_ONLY_SETTINGS_URL, { ...data, deviceType }, {
      headers: { 'Content-Type': 'application/json', Authorization: idToken },
    });
    console.log(res);
    return { error: null, data: res.data };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', isSuccess: false };
  }
}

export async function firmwareUpdaterOnlyFirmware(data: StableFormDataOnlyFirmware, deviceType: DeviceType, idToken: string): Promise<FirmwareUpdaterResponse> {
  try {
    const res = await axios.post(FIRMWARE_UPDATER_ONLY_FIRMWARE_URL, { ...data, deviceType }, {
      headers: { 'Content-Type': 'application/json', Authorization: idToken },
    });
    console.log(res);
    return { error: null, data: res.data };
  } catch (error: any) {
    console.log('error', error);
    return { error: error?.response?.data?.error ?? 'Unknown error', isSuccess: false };
  }
}
