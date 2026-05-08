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
const Membresia    = lazy(() => import('./pages/ministerial/Membresia'));
const Planejamento = lazy(() => import('./pages/Planejamento'));
const AssistenteIA = lazy(() => import('./pages/admin/AssistenteIA'));
const SolicitarCompra = lazy(() => import('./pages/SolicitarCompra'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Perfil = lazy(() => import('./pages/Perfil'));
const NotificacaoRegras = lazy(() => import('./pages/admin/NotificacaoRegras'));

const Loading = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
    <div className="cbrio-loading-logo" style={{ position: 'relative', width: 140, height: 48 }}>
      <svg viewBox="0 0 2000 2000" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <g transform="translate(0,2000) scale(0.1,-0.1)" fill="#00B39D" stroke="none">
          <path d="M13690 13264 c-215 -56 -381 -225 -436 -444 -24 -95 -15 -251 19 -349 64 -183 210 -320 402 -377 41 -13 92 -18 165 -18 172 0 301 53 420 173 172 172 224 446 128 671 -70 164 -236 304 -410 345 -79 18 -216 18 -288 -1z"/>
          <path d="M5562 13150 c-28 -20 -45 -41 -52 -67 -8 -27 -10 -642 -8 -2178 l4 -2140 22 -125 c55 -317 140 -565 276 -803 324 -570 901 -955 1606 -1071 342 -56 766 -44 1091 33 788 185 1367 729 1593 1496 113 385 138 840 70 1255 -131 795 -606 1415 -1306 1704 -270 111 -522 162 -853 173 -456 14 -858 -84 -1159 -282 -55 -36 -78 -45 -113 -45 -56 0 -96 21 -122 63 -21 34 -21 38 -21 955 0 1035 4 977 -73 1033 l-40 29 -437 0 -437 0 -41 -30z m2586 -2749 c245 -52 416 -139 577 -292 190 -182 304 -407 362 -712 25 -131 25 -503 0 -634 -57 -301 -171 -528 -353 -703 -99 -95 -166 -143 -282 -199 -334 -165 -818 -174 -1164 -21 -449 197 -698 640 -698 1240 0 429 120 766 359 1007 177 179 421 295 696 332 112 15 395 5 503 -18z"/>
          <path d="M12570 11429 c-1077 -87 -1755 -652 -1915 -1595 -42 -246 -46 -416 -43 -1719 l3 -1220 22 -31 c47 -65 45 -65 531 -62 481 3 468 2 509 65 17 25 18 108 24 1338 6 1435 3 1370 66 1569 121 384 424 603 911 657 110 12 145 27 172 72 19 30 20 53 20 432 0 448 0 449 -71 487 -36 19 -62 20 -229 7z"/>
          <path d="M13361 11422 c-19 -10 -43 -34 -53 -53 -17 -32 -18 -122 -18 -2234 l0 -2201 23 -44 c16 -32 35 -51 67 -67 l44 -24 427 3 c416 3 428 4 456 24 15 11 38 36 51 54 l22 33 0 2222 0 2222 -34 39 -34 39 -458 3 c-430 2 -461 1 -493 -16z"/>
          <path d="M2555 11405 c-792 -87 -1430 -503 -1762 -1151 -120 -234 -200 -491 -245 -789 -21 -142 -18 -672 5 -795 25 -138 64 -282 104 -390 264 -712 886 -1286 1609 -1485 208 -57 315 -69 614 -69 341 0 527 25 808 110 661 200 1171 691 1401 1347 49 140 37 213 -42 251 -33 15 -81 16 -500 14 l-463 -3 -37 -25 c-20 -13 -46 -43 -58 -65 -92 -167 -203 -299 -332 -396 -365 -272 -959 -317 -1392 -104 -348 172 -568 504 -631 953 -23 163 -15 484 16 626 131 610 542 959 1156 983 523 20 919 -177 1154 -575 23 -40 57 -82 74 -95 l31 -22 472 0 c461 0 472 0 499 21 82 61 89 124 30 279 -255 667 -788 1136 -1493 1314 -296 75 -697 101 -1018 66z"/>
          <path d="M16825 11409 c-1011 -103 -1741 -706 -1982 -1637 -53 -206 -74 -367 -80 -615 -6 -241 5 -395 43 -602 112 -615 437 -1124 924 -1447 284 -189 608 -306 1020 -370 199 -30 642 -33 825 -4 515 79 952 297 1281 638 337 350 540 794 600 1314 23 195 15 582 -16 779 -84 546 -272 948 -605 1294 -319 331 -766 551 -1285 632 -154 24 -568 34 -725 18z m475 -999 c498 -61 855 -357 999 -827 56 -182 65 -256 66 -508 0 -175 -4 -252 -17 -320 -83 -439 -301 -745 -651 -910 -359 -170 -849 -165 -1202 12 -318 159 -528 450 -611 846 -45 219 -44 519 2 747 107 525 469 874 989 954 109 17 310 20 425 6z"/>
        </g>
      </svg>
    </div>
    <span style={{ fontSize: 12, color: 'var(--cbrio-text3, #737373)', fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>Carregando...</span>
  </div>
);

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />;
  return children;
}

function DefaultRedirect() {
  const { getAccessLevel, canAgenda, canProjetos, canExpansao } = useAuth();
  if (canAgenda) return <Navigate to="/eventos" replace />;
  if (canProjetos) return <Navigate to="/projetos" replace />;
  if (canExpansao) return <Navigate to="/expansao" replace />;
  return <Navigate to="/planejamento" replace />;
}

function PermissionGate({ module, minLevel = 2, children }) {
  const { getAccessLevel, loading } = useAuth();
  if (loading) return <Loading />;
  if (getAccessLevel(module) < minLevel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, padding: 40 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--cbrio-text)' }}>Acesso Restrito</h2>
        <p style={{ fontSize: 14, color: 'var(--cbrio-text2)', textAlign: 'center', maxWidth: 400 }}>
          Você não tem permissão para acessar este módulo. Contate o administrador para solicitar acesso.
        </p>
      </div>
    );
  }
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
        <Route index element={<Suspense fallback={<Loading />}><Dashboard /></Suspense>} />
        <Route path="dashboard" element={<Suspense fallback={<Loading />}><Dashboard /></Suspense>} />

        {/* Planejamento (hub PMO) */}
        <Route path="planejamento" element={
          <PermissionGate module={['Projetos', 'Tarefas', 'Agenda']}>
            <Suspense fallback={<Loading />}><Planejamento /></Suspense>
          </PermissionGate>
        } />

        {/* Projetos e Eventos */}
        <Route path="eventos" element={
          <PermissionGate module={['Agenda']}>
            <Suspense fallback={<Loading />}><Eventos /></Suspense>
          </PermissionGate>
        } />
        <Route path="eventos/:id" element={
          <PermissionGate module={['Agenda']}>
            <Suspense fallback={<Loading />}><EventDetail /></Suspense>
          </PermissionGate>
        } />
        <Route path="projetos" element={
          <PermissionGate module={['Projetos', 'Tarefas']}>
            <Suspense fallback={<Loading />}><Projetos /></Suspense>
          </PermissionGate>
        } />
        <Route path="expansao" element={
          <PermissionGate module={['Projetos']}>
            <Suspense fallback={<Loading />}><Expansao /></Suspense>
          </PermissionGate>
        } />


        {/* Perfil (acessível a todos) */}
        <Route path="perfil" element={
          <Suspense fallback={<Loading />}><Perfil /></Suspense>
        } />

        {/* Solicitação de compra (acessível a todos) */}
        <Route path="solicitar-compra" element={
          <Suspense fallback={<Loading />}><SolicitarCompra /></Suspense>
        } />

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

        {/* Assistente IA */}
        <Route path="assistente-ia" element={
          <ProtectedRoute roles={['admin', 'diretor']}>
            <Suspense fallback={<Loading />}><AssistenteIA /></Suspense>
          </ProtectedRoute>
        } />

        {/* Configurações */}
        <Route path="admin/notificacao-regras" element={
          <ProtectedRoute roles={['admin', 'diretor']}>
            <Suspense fallback={<Loading />}><NotificacaoRegras /></Suspense>
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
