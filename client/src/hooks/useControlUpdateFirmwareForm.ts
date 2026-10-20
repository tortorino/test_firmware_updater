import { useForm } from 'react-hook-form';
import { StableFormData } from '@interface/core.ts';
import { useXlsTableData } from '@store/xlsTableData.ts';
import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';
import { useEffect } from 'react';

export const useControlUpdateFirmwareForm = () => {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
    getValues,
    control,
  } = useForm<StableFormData>({
    mode: 'onChange',
    defaultValues: {
      uuid: '',
      deviceName: '',
      serialNumber: '',
      manufactureDate: '',
      coreSerialNumber: '',
      lrfSerialNumber: '',
      clickX: 0,
      clickY: 0,
      masterPas: undefined,
      autoGenMasterPas: false,
      vcom: 0,
      Firmware: '',
    },
  });

  const chosenRow = useXlsTableData((state) => state.chosenRow);
  const droppedFormData = useUpdateFirmwareAndSettingsStore((state) => state.formData);

  useEffect(() => {
    if (droppedFormData) {
      console.log('droppedFormData', droppedFormData);

      Object.entries(droppedFormData).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [droppedFormData, setValue]);

  useEffect(() => {
    if (chosenRow) {
      console.log('chosenRow', chosenRow);
      Object.entries(chosenRow).forEach(([key, value]) => {
        setValue(key, value);
      });
    }
  }, [chosenRow, setValue]);

  const autoGenMasterPasValue = watch('autoGenMasterPas');

  useEffect(() => {
    if (autoGenMasterPasValue) {
      setValue('masterPas', undefined);
    }
  }, [autoGenMasterPasValue, setValue]);

  return {
    register,
    getValues,
    setValue,
    errors,
    watch,
    control,
  };
};
