import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { lazy, Suspense } from 'react';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';

// Lazy loading por módulo
const Eventos      = lazy(() => import('./pages/eventos/Eventos'));
const EventDetail  = lazy(() => import('./pages/eventos/EventDetail'));
const Projetos     = lazy(() => import('./pages/Projetos'));
const Expansao     = lazy(() => import('./pages/Expansao'));
const RH           = lazy(() => import('./pages/admin/rh/RH'));
const Financeiro   = lazy(() => import('./pages/admin/financeiro/Financeiro'));
const Logistica    = lazy(() => import('./pages/admin/logistica/Logistica'));
const Patrimonio   = lazy(() => import('./pages/admin/patrimonio/Patrimonio'));
const Calendario   = lazy(() => import('./pages/Calendario'));
const Membresia    = lazy(() => import('./pages/ministerial/Membresia'));

const Loading = () => (
  <div style={{ padding: 40, color: '#6b7280', fontSize: 14 }}>Carregando módulo...</div>
);

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/eventos" replace />} />

        {/* Projetos e Eventos */}
        <Route path="eventos" element={<Suspense fallback={<Loading />}><Eventos /></Suspense>} />
        <Route path="eventos/:id" element={<Suspense fallback={<Loading />}><EventDetail /></Suspense>} />
        <Route path="projetos" element={<Suspense fallback={<Loading />}><Projetos /></Suspense>} />
        <Route path="expansao" element={<Suspense fallback={<Loading />}><Expansao /></Suspense>} />
        <Route path="calendario" element={<Suspense fallback={<Loading />}><Calendario /></Suspense>} />

        {/* Administrativo */}
        <Route
          path="admin/rh"
          element={
            <ProtectedRoute roles={['admin', 'diretor']}>
              <Suspense fallback={<Loading />}><RH /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/financeiro"
          element={
            <ProtectedRoute roles={['admin', 'diretor']}>
              <Suspense fallback={<Loading />}><Financeiro /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/logistica"
          element={
            <ProtectedRoute roles={['admin', 'diretor']}>
              <Suspense fallback={<Loading />}><Logistica /></Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/patrimonio"
          element={
            <ProtectedRoute roles={['admin', 'diretor']}>
              <Suspense fallback={<Loading />}><Patrimonio /></Suspense>
            </ProtectedRoute>
          }
        />

        {/* Ministerial */}
        <Route path="ministerial/membresia" element={
          <ProtectedRoute roles={['admin', 'diretor']}>
            <Suspense fallback={<Loading />}><Membresia /></Suspense>
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/eventos" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
