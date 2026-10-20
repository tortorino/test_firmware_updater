import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';
import { useEffect, useState } from 'react';
import { getFirmwareList } from '@api/firmwareList.ts';
import { organizeBucketListItems } from '@utils/organizeBucketListItems.ts';
import { useSettingsStore } from '@store/settings.ts';
import { Nullable } from '@interface/core.ts';

export const useGetDeviceList = () => {
  const setDeviceList = useUpdateFirmwareAndSettingsStore((state) => state.setDeviceList);
  const deviceType = useUpdateFirmwareAndSettingsStore((state) => state.deviceType);
  const idToken = useSettingsStore((state) => state.idToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Nullable<string>>(null);

  useEffect(() => {
    if (idToken) {
      // Ignore a response that arrives after the device type was switched again
      let isStale = false;
      setIsLoading(true);
      setError(null);
      getFirmwareList(idToken, deviceType)
        .then((e) => {
          if (isStale) return;
          if (e.data) {
            const devList = organizeBucketListItems(e.data);
            setDeviceList(devList);
          } else {
            setError(e.error);
          }
        })
        .catch((e) => !isStale && setError(e))
        .finally(() => !isStale && setIsLoading(false));
      return () => {
        isStale = true;
      };
    }
  }, [idToken, deviceType, setDeviceList]);
  return { isDeviseListLoading: isLoading, deviceListError: error };
};
