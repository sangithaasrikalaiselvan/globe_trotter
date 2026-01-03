import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import NewTrip from './pages/NewTrip';
import TripDetail from './pages/TripDetail';
import AddStop from './pages/AddStop';
import AddActivity from './pages/AddActivity';
import Profile from './pages/Profile';
import SharedTrip from './pages/SharedTrip';
import Budget from './pages/Budget';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/shared/:id" element={<SharedTrip />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <Trips />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/new"
            element={
              <ProtectedRoute>
                <NewTrip />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <TripDetail />
              </ProtectedRoute>
            }
          />

          {/* ⭐ ADD THIS BUDGET ROUTE ⭐ */}
          <Route
            path="/trips/:id/budget"
            element={
              <ProtectedRoute>
                <Budget />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/:id/add-stop"
            element={
              <ProtectedRoute>
                <AddStop />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips/:id/stops/:stopId/add-activity"
            element={
              <ProtectedRoute>
                <AddActivity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
