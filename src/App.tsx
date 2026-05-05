import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/layouts/public-layout";
import HomePage from "@/routes/home";
import AuthenticationLayout from "@/layouts/auth-layout";
import { SignInPage } from "@/routes/sign-in";
import { SignUpPage } from "@/routes/sign-up";
import ProtectedRoutes from "@/layouts/protected-routes";
import MainLayout from "@/layouts/main-layout";
import InterviewLayout from "@/layouts/interview-layout";   // ← new
import AuthHandler from "@/handlers/auth-handler";
import Generate from "./components/generate";
import Dashboard from "./routes/dashboard";
import CreateEditPage from "./routes/create-edit-page";
import MockLoadPage from "./routes/mock-load-page";
import MockInterviewPage from "./routes/mock-interview-page";
import Feedback from "./routes/feedback";

const App = () => {
  return (
    <Router>
      <AuthHandler />
      <Routes>

        {/* ── Public routes ────────────────────────────────────────────── */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* ── Auth routes ──────────────────────────────────────────────── */}
        <Route path="/" element={<AuthenticationLayout />}>
          <Route path="sign-in/*" element={<SignInPage />} />
          <Route path="sign-up/*" element={<SignUpPage />} />
        </Route>

        {/* ── Protected routes WITH header + footer (MainLayout) ────────── */}
        <Route
          element={
            <ProtectedRoutes>
              <MainLayout />
            </ProtectedRoutes>
          }
        >
          <Route path="/generate" element={<Generate />}>
            <Route index element={<Dashboard />} />
            <Route path=":interviewId" element={<CreateEditPage />} />
            {/* Pre-flight page — breadcrumbs visible, no proctoring yet */}
            <Route
              path="interview/:interviewId"
              element={<MockLoadPage />}
            />
            <Route path="feedback/:interviewId" element={<Feedback />} />
          </Route>
        </Route>

        {/* ── Live interview — NO header, NO nav, NO footer ─────────────
            Uses InterviewLayout (bare wrapper) instead of MainLayout.
            Proctoring is active inside MockInterviewPage.               */}
        <Route
          element={
            <ProtectedRoutes>
              <InterviewLayout />
            </ProtectedRoutes>
          }
        >
          <Route
            path="/generate/interview/:interviewId/start"
            element={<MockInterviewPage />}
          />
        </Route>

      </Routes>
    </Router>
  );
};

export default App;