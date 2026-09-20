import { Suspense, lazy, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Skeleton, Toaster } from './components/ui';
import { EmployerLayout } from './layouts/EmployerLayout';
import { SeekerLayout } from './layouts/SeekerLayout';
import { AuthProvider, useAuth } from './lib/auth';
import type { Role } from './lib/types';
import { Messages } from './pages/Messages';
import { ForgotPassword, ResetPassword, Signup, VerifyEmail } from './pages/public/Auth';
import { AccountSettings } from './pages/Account';
import { Login } from './pages/public/Login';
import { Landing } from './pages/public/Landing';
import { PrivacyPolicy, TermsOfService } from './pages/public/Legal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setSlowRequestHandler } from './lib/api';
import { toast } from './lib/hooks';

// Seeker
const SeekerOnboarding = lazy(() => import('./pages/seeker/Onboarding').then((m) => ({ default: m.SeekerOnboarding })));
const ProfileReview = lazy(() => import('./pages/seeker/ProfileReview').then((m) => ({ default: m.ProfileReview })));
const SeekerHome = lazy(() => import('./pages/seeker/Home').then((m) => ({ default: m.SeekerHome })));
const SeekerBrowse = lazy(() => import('./pages/seeker/Home').then((m) => ({ default: m.SeekerBrowse })));
const SeekerJobPage = lazy(() => import('./pages/seeker/Home').then((m) => ({ default: m.SeekerJobPage })));
const SeekerApplications = lazy(() => import('./pages/seeker/Applications').then((m) => ({ default: m.SeekerApplications })));
const SeekerProfilePage = lazy(() => import('./pages/seeker/Profile').then((m) => ({ default: m.SeekerProfilePage })));
// Employer
const CompanyProfile = lazy(() => import('./pages/employer/Company').then((m) => ({ default: m.CompanyProfile })));
const EmployerDashboard = lazy(() => import('./pages/employer/Dashboard').then((m) => ({ default: m.EmployerDashboard })));
const EmployerJobs = lazy(() => import('./pages/employer/Jobs').then((m) => ({ default: m.EmployerJobs })));
const PostJob = lazy(() => import('./pages/employer/PostJob').then((m) => ({ default: m.PostJob })));
const EmployerCandidates = lazy(() => import('./pages/employer/Candidates').then((m) => ({ default: m.EmployerCandidates })));
const CandidatePage = lazy(() => import('./pages/employer/Candidates').then((m) => ({ default: m.CandidatePage })));
const EmployerAnalytics = lazy(() => import('./pages/employer/Analytics').then((m) => ({ default: m.EmployerAnalytics })));

function Loading() {
  return (
    <div className="max-w-[1280px] mx-auto px-margin-sm lg:px-margin-lg py-space-lg flex flex-col gap-space-md">
      <Skeleton className="h-16" />
      <Skeleton className="h-64" />
    </div>
  );
}

/**
 * Role guard. Rules:
 *  - not signed in → /login (role pre-selected)
 *  - signed in to the *other* portal → /login for this role (a session is locked to the role chosen at login)
 *  - signed in but the account isn't registered under this role → back to login (one email = one role)
 *  - has role but onboarding incomplete → the role's onboarding (unless already there)
 */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, profiles, activeRole, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={`/login?role=${role}`} replace state={{ from: pathname }} />;
  if (activeRole !== role) return <Navigate to={`/login?role=${role}`} replace />;
  if (!user.roles.includes(role)) return <Navigate to={`/login?role=${role}`} replace />;
  const onboarded = role === 'seeker' ? profiles?.seekerOnboarded : profiles?.employerOnboarded;
  const onOnboarding = pathname.startsWith(`/${role}/onboarding`);
  if (!onboarded && !onOnboarding && !pathname.startsWith(`/${role}/profile`) && !pathname.startsWith(`/${role}/account`)) return <Navigate to={`/${role}/onboarding`} replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    setSlowRequestHandler(() => toast.show('The server is waking up — the first request can take up to a minute.', 'info'));
  }, []);
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            <Route
              path="/seeker"
              element={
                <RequireRole role="seeker">
                  <SeekerLayout />
                </RequireRole>
              }
            >
              <Route index element={<SeekerHome />} />
              <Route path="onboarding" element={<SeekerOnboarding />} />
              <Route path="onboarding/review" element={<ProfileReview />} />
              <Route path="browse" element={<SeekerBrowse />} />
              <Route path="jobs/:id" element={<SeekerJobPage />} />
              <Route path="applications" element={<SeekerApplications />} />
              <Route path="messages" element={<Messages role="seeker" />} />
              <Route path="messages/:applicationId" element={<Messages role="seeker" />} />
              <Route path="profile" element={<SeekerProfilePage />} />
              <Route path="account" element={<AccountSettings role="seeker" />} />
              <Route path="*" element={<Navigate to="/seeker" replace />} />
            </Route>

            <Route
              path="/employer"
              element={
                <RequireRole role="employer">
                  <EmployerLayout />
                </RequireRole>
              }
            >
              <Route index element={<EmployerDashboard />} />
              <Route path="onboarding" element={<CompanyProfile onboarding />} />
              <Route path="profile" element={<CompanyProfile />} />
              <Route path="jobs" element={<EmployerJobs />} />
              <Route path="jobs/new" element={<PostJob />} />
              <Route path="jobs/:id/edit" element={<PostJob />} />
              <Route path="candidates" element={<EmployerCandidates />} />
              <Route path="candidates/:applicationId" element={<CandidatePage />} />
              <Route path="messages" element={<Messages role="employer" />} />
              <Route path="messages/:applicationId" element={<Messages role="employer" />} />
              <Route path="analytics" element={<EmployerAnalytics />} />
              <Route path="account" element={<AccountSettings role="employer" />} />
              <Route path="*" element={<Navigate to="/employer" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
