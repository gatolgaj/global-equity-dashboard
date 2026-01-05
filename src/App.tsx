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

function App() {
  return (
    <BrowserRouter>
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
          <Route path="composition" element={<Composition />} />
          <Route path="factors" element={<FactorAnalysis />} />
          <Route path="holdings" element={<Holdings />} />
          <Route path="reports" element={<Reports />} />
          <Route path="presentation" element={<Presentation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
