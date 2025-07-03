import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from './pages/loginPage';
import { EnterPage } from './pages/enterPage';
import { Main } from './pages/main';
import { Box } from '@mui/material';
import { ProtectedAppRoute } from '@components/protectedRouts/protectedAppRoute.tsx';
import { RequestForAccess } from '@/pages/requestForAccess';
import { NotificationList } from '@components/notification';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const RECAPTCHA_SITE_KEY = '6LfmInYrAAAAAJnU0i2hTK6ULVK59yd4A_mA5onH';

function App() {
  return (
    <Box
      sx={{
        width: '100vw',
        minHeight: '100vh',
        paddingLeft: 2,
        paddingRight: 2,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/app" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/enter" element={<EnterPage />} />
        <Route
          path="/request"
          element={
            <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY} scriptProps={{ async: true, defer: true }}>
              <RequestForAccess />
            </GoogleReCaptchaProvider>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedAppRoute>
              <Main />
            </ProtectedAppRoute>
          }
        />
      </Routes>
      <NotificationList />
    </Box>
  );
}

export default App;
