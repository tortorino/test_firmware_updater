import React from 'react';
import { Box, Button, Card, CardContent, IconButton, Tab, Tabs, Typography, useMediaQuery } from '@mui/material';
import { useCallback, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { DeviceInfoDirectory } from './dragAndDrop';
import { useControlUpdateFirmwareForm } from '@/hooks/useControlUpdateFirmwareForm.ts';
import { SettingsForm } from '@/pages/main/settingsForm';
import { IXSLUploader } from '@/pages/main/IXSLUploader';
import { SensorsTable } from '@/pages/main/SensorsTable';
import { ChooseFirmware } from '@/pages/main/chooseFirmware';
import { firmwareUpdaterFull, firmwareUpdaterOnlyFirmware, firmwareUpdaterOnlySettings, FirmwareUpdaterResponse } from '@api/firmwareUpdater.ts';
import { useSettingsStore } from '@store/settings.ts';
import { DeviceType, StableFormDataOnlyFirmware, StableFormDataOnlySettings } from '@interface/core.ts';
import { useGetDeviceList } from '@/hooks/useGetDeviceList.ts';
import { downloadFile } from '@utils/downloadFile.ts';
import { useNotificationStore } from '@store/notification.ts';
import { useNavigate } from 'react-router';
import { useUpdateFirmwareAndSettingsStore } from '@store/updateFirmwareAndSettings.ts';

export const Main: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isSecondCardVisible, setIsSecondCardVisible] = useState(true);
  const [secondCardWidth, setSecondCardWidth] = useState('895.19px');
  const isSmallScreen = useMediaQuery('(max-width:1200px)');
  const idToken = useSettingsStore((state) => state.idToken);
  const { register, getValues, setValue, watch, control, errors } = useControlUpdateFirmwareForm();
  const deviceType = useUpdateFirmwareAndSettingsStore((state) => state.deviceType);
  const setDeviceType = useUpdateFirmwareAndSettingsStore((state) => state.setDeviceType);
  const { isDeviseListLoading, deviceListError } = useGetDeviceList();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const clearTokens = useSettingsStore((props) => props.clearTokens);
  const navigate = useNavigate();

  const logOutAction = useCallback(() => {
    clearTokens();
    navigate('/login', { replace: true });
  }, [clearTokens, navigate]);

  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChangeDeviceType = (_event: React.SyntheticEvent, newValue: DeviceType) => {
    setDeviceType(newValue);
    // The selected firmware belongs to the previous device type's list
    setValue('Firmware', '');
  };

  const toggleSecondCard = () => {
    setIsSecondCardVisible((prev) => {
      if (!prev)
        setSecondCardWidth('895.19px'); // Open
      else setSecondCardWidth('0px'); // Close
      return !prev;
    });
  };

  const handleSubmit = useCallback(async () => {
    try {
      if (idToken === null) {
        throw new Error('idToken === null');
      }

      const values = getValues();
      let resp: FirmwareUpdaterResponse;

      if (tabValue === 0) {
        resp = await firmwareUpdaterFull(values, deviceType, idToken);
      } else if (tabValue === 1) {
        const data: StableFormDataOnlyFirmware = { Firmware: values.Firmware };
        resp = await firmwareUpdaterOnlyFirmware(data, deviceType, idToken);
      } else if (tabValue === 2) {
        const data: StableFormDataOnlySettings = {
          serialNumber: values.serialNumber,
          lrfSerialNumber: values.lrfSerialNumber,
          coreSerialNumber: values.coreSerialNumber,
          masterPas: values.masterPas,
          autoGenMasterPas: values.autoGenMasterPas,
          deviceName: values.deviceName,
          clickX: values.clickX,
          clickY: values.clickY,
          uuid: values.uuid,
          vcom: values.vcom,
          manufactureDate: values.manufactureDate,
        };
        resp = await firmwareUpdaterOnlySettings(data, deviceType, idToken);
      } else {
        throw new Error(`Unknown tabValue: ${tabValue}`);
      }

      if (resp.data) {
        downloadFile(resp.data.downloadUrl);
      } else {
        addNotification({ message: `Failed ${resp.error}`, type: 'error' });
      }
    } catch (e) {
      addNotification({ message: `Failed ${e}`, type: 'error' });

      console.log(e);
    }
  }, [addNotification, deviceType, getValues, idToken, tabValue]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        gap: 4,
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        maxWidth: '100%',
      }}
    >
      {/* Button to open the second card */}
      {!isSecondCardVisible && !isSmallScreen && (
        <Button
          variant="contained"
          onClick={toggleSecondCard}
          sx={{
            position: 'absolute',
            top: 16,
            right: 120,
            zIndex: 10,
            fontWeight: 500,
            fontSize: '1rem',
          }}
        >
          XLSX
        </Button>
      )}

      <Button
        variant="contained"
        type="reset"
        onClick={logOutAction}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          fontWeight: 500,
          fontSize: '1rem',
          backgroundColor: '#a11a1a',
          '&:hover': {
            backgroundColor: '#9a0007',
          },
        }}
      >
        Log Out
      </Button>

      {/* First card */}
      <Card
        sx={{
          maxWidth: '90%',
          minWidth: 300,
          p: 0.5,
          borderRadius: 2,
        }}
      >
        <CardContent>
          <DeviceInfoDirectory />
          <Tabs value={deviceType} onChange={handleChangeDeviceType} variant="fullWidth" textColor="primary" indicatorColor="primary">
            <Tab label="TSA" value="TSA" />
            <Tab label="TMA" value="TMA" />
          </Tabs>
          <Tabs value={tabValue} onChange={handleChangeTab} variant="fullWidth" textColor="primary" indicatorColor="primary">
            <Tab label="Update firmware and settings" />
            <Tab label="Update firmware" />
            <Tab label="Update settings" />
          </Tabs>

          <Box component="form" sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 2 }}>
            {tabValue === 0 && (
              <>
                <SettingsForm watch={watch} register={register} errors={errors} />
                <ChooseFirmware control={control} error={deviceListError} isLoading={isDeviseListLoading} />
              </>
            )}

            {tabValue === 1 && <ChooseFirmware control={control} error={deviceListError} isLoading={isDeviseListLoading} />}

            {tabValue === 2 && <SettingsForm watch={watch} register={register} errors={errors} />}
          </Box>
        </CardContent>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          sx={{
            display: 'block',
            mx: 'auto',
            width: 'calc(100% - 32px)',
            marginBottom: 2,
          }}
        >
          Download update file
        </Button>
      </Card>

      {/* Second card */}
      <Card
        sx={{
          display: 'flex',
          maxWidth: '90%',
          maxHeight: isSmallScreen ? 'unset' : '80vh',
          width: isSmallScreen ? 'auto' : secondCardWidth,
          p: isSecondCardVisible ? 0.5 : 0,
          borderRadius: 2,
          mt: 2,
          position: 'relative',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Typography textAlign={'center'} variant="h5" sx={{ fontWeight: '500', marginBottom: 2 }}>
            XLSX Data Import
          </Typography>
          <IconButton
            onClick={toggleSecondCard}
            sx={{
              display: isSmallScreen ? 'none' : 'flex',
              position: 'absolute',
              top: 4,
              right: 4,
            }}
          >
            <CloseIcon />
          </IconButton>
          <IXSLUploader />
          <SensorsTable />
        </CardContent>
      </Card>
    </Box>
  );
};
