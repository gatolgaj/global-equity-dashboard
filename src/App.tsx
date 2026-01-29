import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Performance } from './pages/Performance';
import { Composition } from './pages/Composition';
import { Holdings } from './pages/Holdings';
import { Reports } from './pages/Reports';
import { Presentation } from './pages/Presentation';
import { FactorAnalysis } from './pages/FactorAnalysis';
import { Risk } from './pages/Risk';
import { Optimisation } from './pages/Optimisation';
import { OptimisationPresentation } from './pages/OptimisationPresentation';
import { MomentumNSNPresentation } from './pages/MomentumNSNPresentation';
import { ActiveRiskManagement } from './pages/ActiveRiskManagement';
import { ActiveRiskPresentation } from './pages/ActiveRiskPresentation';
import { usePortfolioStore } from './stores/portfolioStore';
import { useAuthStore } from './stores/authStore';

function AppInitializer({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializeFromSupabase = usePortfolioStore((state) => state.initializeFromSupabase);
  const isInitialized = usePortfolioStore((state) => state.isInitialized);

  useEffect(() => {
    // Load data from Supabase when user is authenticated
    if (isAuthenticated && !isInitialized) {
      initializeFromSupabase();
    }
  }, [isAuthenticated, isInitialized, initializeFromSupabase]);

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Public route - Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes - Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="performance" element={<Performance />} />
            <Route path="risk" element={<Risk />} />
            <Route path="composition" element={<Composition />} />
            <Route path="factors" element={<FactorAnalysis />} />
            <Route path="holdings" element={<Holdings />} />
            <Route path="optimisation" element={<Optimisation />} />
            <Route path="optimisation-presentation" element={<OptimisationPresentation />} />
            <Route path="momentum-nsn" element={<MomentumNSNPresentation />} />
            <Route path="active-risk" element={<ActiveRiskManagement />} />
            <Route path="active-risk-presentation" element={<ActiveRiskPresentation />} />
            <Route path="reports" element={<Reports />} />
            <Route path="presentation" element={<Presentation />} />
          </Route>
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
}

export default App;
