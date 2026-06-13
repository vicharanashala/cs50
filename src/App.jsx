import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast.jsx";
import Protected from "./components/common/Protected.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import AuthPage from "./features/auth/AuthPage.jsx";
import AdminLogin from "./features/auth/AdminLogin.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import AskFaqPage from "./pages/AskFaqPage.jsx";
import FaqDetailPage from "./pages/FaqDetailPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminPage from "./features/admin/AdminPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/faqs" element={<FeedPage />} />
        <Route path="/faqs/ask" element={<Protected><AskFaqPage /></Protected>} />
        <Route path="/faqs/:id" element={<FaqDetailPage />} />
        <Route path="/faqs/:id/answer" element={<Protected><FaqDetailPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/admin/*" element={<Protected admin><AdminPage /></Protected>} />
        <Route path="*" element={<Navigate to="/faqs" replace />} />
      </Routes>
    </ToastProvider>
  );
}

