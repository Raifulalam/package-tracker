import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoutes';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import LandingPage from './pages/LandinPage';
import Login from './pages/Login';
import MyPackages from './pages/MyPackage';
import NewDelivery from './pages/NewDelivery';
import PaymentPage from './pages/PaymentPage';
import Profile from './pages/Profile';
import Register from './pages/Register';
import SenderDashboard from './pages/SenderDashboard';
import TrackDelivery from './pages/TrackDelivery';
import TrackPackage from './pages/TrackPackage';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/track" element={<TrackPackage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['sender']}>
                  <SenderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/create"
              element={
                <ProtectedRoute roles={['sender']}>
                  <NewDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/my-packages"
              element={
                <ProtectedRoute roles={['sender']}>
                  <MyPackages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/track/:id"
              element={
                <ProtectedRoute roles={['sender']}>
                  <TrackDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shipments/:id"
              element={
                <ProtectedRoute roles={['sender', 'agent', 'admin']}>
                  <TrackDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent"
              element={
                <ProtectedRoute roles={['agent']}>
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute roles={['sender', 'agent', 'admin']}>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={['sender', 'agent', 'admin']}>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
