import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AnimatePresence, motion } from "framer-motion";
import PrivacyPolicy from './pages/PrivacyPolicy';
import PreservedTabs, { TAB_PATHS } from '@/components/PreservedTabs';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.15, ease: "easeIn" } },
};

const AnimatedPage = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: "100%" }}>
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render the main app with auth-gated routes
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={TAB_PATHS.includes(location.pathname) ? '__tabs__' : location.pathname}>
        {/* Public auth routes */}
        <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
        <Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
        <Route path="/reset-password" element={<AnimatedPage><ResetPassword /></AnimatedPage>} />

        {/* Auth-gated app routes */}
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/" element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <AnimatedPage><MainPage /></AnimatedPage>
            </LayoutWrapper>
          } />
          {/* Tab pages — state preserved across tab switches via PreservedTabs */}
          {TAB_PATHS.map((tabPath) => (
            <Route
              key={tabPath}
              path={tabPath}
              element={
                <LayoutWrapper currentPageName={tabPath.slice(1)}>
                  <PreservedTabs />
                </LayoutWrapper>
              }
            />
          ))}
          {/* Non-tab pages from config */}
          {Object.entries(Pages)
            .filter(([path]) => path !== mainPageKey && !TAB_PATHS.includes(`/${path}`))
            .map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <LayoutWrapper currentPageName={path}>
                    <AnimatedPage><Page /></AnimatedPage>
                  </LayoutWrapper>
                }
              />
            ))}
          <Route path="/privacy-policy" element={<AnimatedPage><PrivacyPolicy /></AnimatedPage>} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App