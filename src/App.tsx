import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/layouts/public-layout";
import HomePage from "@/routes/home";
import AuthenticationLayout from "@/layouts/auth-layout";
import { SignInPage } from "@/routes/sign-in";
import { SignUpPage } from "@/routes/sign-up";
import ProtectedRoutes from "@/layouts/protected-routes";
import MainLayout from "@/layouts/main-layout";


const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        </Route>

        {/*Authenticated routes */}
        <Route element={<AuthenticationLayout />}>
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        </Route>

        {/* Private routes */}
        <Route element={
          <ProtectedRoutes>
            <MainLayout />
          </ProtectedRoutes>
        }
        >
          {/* add all protected routes here */}
          

        </Route>
      </Routes>
    </Router>
  );
};

export default  App