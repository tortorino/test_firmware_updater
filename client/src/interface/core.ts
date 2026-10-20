export type Nullable<T> = T | null;

export type DeviceType = 'TSA' | 'TMA';

export interface DeviceInfo {
  name_device?: string;
  serial_number?: string;
  data_manufacture?: string;
  firmware?: string;
  serial_core?: string;
  serial_lrf?: string;
  click_x?: number;
  click_y?: number;
  vcom?: number;
  uuid: string;
}

export interface StableDeviceInfo {
  name_device: string;
  serial_number: string;
  data_manufacture: string;
  firmware: string;
  serial_core: string;
  serial_lrf: string;
  click_x: number;
  click_y: number;
  vcom: number;
  uuid: string;
}

export interface FormData {
  deviceName?: string;
  serialNumber?: string;
  manufactureDate?: string;
  coreSerialNumber?: string;
  lrfSerialNumber?: string;
  clickX?: number;
  clickY?: number;
  masterPas?: number;
  autoGenMasterPas: boolean;
  vcom?: number;
  uuid?: string;
  Firmware?: string;
  [key: string]: string | number | boolean | undefined;
}

export const emptyFormData: FormData = {
  autoGenMasterPas: false,
  deviceName: undefined,
  serialNumber: undefined,
  manufactureDate: undefined,
  coreSerialNumber: undefined,
  clickX: undefined,
  clickY: undefined,
  vcom: undefined,
  uuid: undefined,
  Firmware: undefined,
};

export interface StableFormData {
  deviceName: string;
  serialNumber: string;
  manufactureDate: string;
  coreSerialNumber: string;
  lrfSerialNumber: string;
  clickX: number;
  clickY: number;
  masterPas: number;
  autoGenMasterPas: boolean;
  vcom: number;
  uuid: string;
  Firmware: string;
  [key: string]: string | number | boolean | undefined;
}

export type StableFormDataOnlyFirmware = Pick<StableFormData, 'Firmware'>;
export type StableFormDataOnlySettings = Omit<StableFormData, 'Firmware'>;
