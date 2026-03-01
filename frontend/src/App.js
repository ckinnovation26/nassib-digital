import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { WaiterDashboard } from './pages/WaiterDashboard';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { AccountingDashboard } from './pages/AccountingDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Payment } from './pages/Payment';
import { Toaster } from 'sonner';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'chef':
      return <Navigate to="/kitchen" replace />;
    case 'accountant':
      return <Navigate to="/accounting" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/waiter" replace />;
  }
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-slate-900 border-slate-800 text-slate-50',
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route
              path="/waiter"
              element={
                <ProtectedRoute roles={['waiter', 'admin']}>
                  <WaiterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute roles={['chef', 'admin']}>
                  <KitchenDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounting"
              element={
                <ProtectedRoute roles={['accountant', 'admin']}>
                  <AccountingDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/:orderId"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;