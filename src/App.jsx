import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import SenderDashboard from './pages/SenderDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard'; // Add if needed
import TrackPackage from './pages/TrackPackage';

import ProtectedRoute from './components/ProtectedRoutes';
import { AuthProvider } from './context/AuthContext';

import NewDelivery from './pages/NewDelivery';
import MyPackages from './pages/MyPackage';
import TrackDelivery from './pages/TrackDelivery';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 🔓 Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 📦 Sender Routes */}
          <Route
            path="/"
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

          {/* 🚚 Agent Routes */}
          <Route
            path="/agent"
            element={
              <ProtectedRoute roles={['agent']}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* 📡 Shared Tracking Route */}
          <Route
            path="/track"
            element={
              <ProtectedRoute roles={['sender', 'agent', 'admin']}>
                <TrackPackage />
              </ProtectedRoute>
            }
          />

          {/* 🛠 Admin Route (optional) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
