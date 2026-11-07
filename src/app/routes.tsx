import { AuthGuard } from "@/app/components/AuthGuard";
import PublicProfilePage from "@/app/pages/PublicProfilePage";
import AssessmentPage from "@/app/pages/AssessmentPage";
import AssessmentAdminPage from "@/app/pages/AssessmentAdminPage";
import VerifyEmailPage from "@/app/pages/VerifyEmailPage";
import IntegrityAdminPage from "@/app/pages/IntegrityAdminPage";
import { createBrowserRouter } from "react-router";

import PreviewPage from "@/app/pages/PreviewPage";
import LoginPage from "@/app/pages/LoginPage";
import SignupPage from "@/app/pages/SignupPage";
import DashboardPage from "@/app/pages/DashboardPage";
import ProfilePage from "@/app/pages/ProfilePage";
import ChatPage from "@/app/pages/ChatPage";
import SwapAgreementPage from "@/app/pages/SwapAgreementPage";
import ReputationPage from "@/app/pages/ReputationPage";
import AdminDashboardPage from "@/app/pages/AdminDashboardPage";
import KnoxHubPage from "@/app/pages/KnoxHubPage";
import CalendarPage from "@/app/pages/CalendarPage";
import PrivacyPolicyPage from "@/app/pages/PrivacyPolicyPage";
import SecurityPage from "@/app/pages/SecurityPage";
import ReportUserPage from "@/app/pages/ReportUserPage";
import LeaderboardPage from "@/app/pages/LeaderboardPage";
import AchievementsPage from "@/app/pages/AchievementsPage";
import CommunityForumPage from "@/app/pages/CommunityForumPage";
import PostDetailsPage from "@/app/pages/PostDetailsPage";
import NotificationPage from "@/app/pages/NotificationPage";
import AnalyticsPage from "@/app/pages/AnalyticsPage";
import ActivityTimelinePage from "@/app/pages/ActivityTimelinePage";
import MySkillsPage from "@/app/pages/MySkillsPage";
import SwapDetailsPage from "@/app/pages/SwapDetailsPage";

const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard role="ADMIN">{children}</AuthGuard>
);
const StudentRoute = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard role="USER">{children}</AuthGuard>
);

export const router = createBrowserRouter([
  {
    path: "/admin/integrity",
    element: (
      <AdminRoute>
        <IntegrityAdminPage />
      </AdminRoute>
    ),
  },
  { path: "/verify-email", Component: VerifyEmailPage },
  {
    path: "/students/:userId",
    element: (
      <AuthGuard>
        <PublicProfilePage />
      </AuthGuard>
    ),
  },
  {
    path: "/assessments/offerings/:offeringId",
    element: (
      <StudentRoute>
        <AssessmentPage />
      </StudentRoute>
    ),
  },
  {
    path: "/assessments/:attemptId",
    element: (
      <StudentRoute>
        <AssessmentPage />
      </StudentRoute>
    ),
  },
  {
    path: "/admin/assessments",
    element: (
      <AdminRoute>
        <AssessmentAdminPage />
      </AdminRoute>
    ),
  },
  {
    path: "/",
    Component: PreviewPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  // Protected Student Routes (Admins are blocked from swap workflows)
  {
    path: "/dashboard",
    element: (
      <StudentRoute>
        <DashboardPage />
      </StudentRoute>
    ),
  },
  {
    path: "/my-skills",
    element: (
      <StudentRoute>
        <MySkillsPage />
      </StudentRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <StudentRoute>
        <ChatPage />
      </StudentRoute>
    ),
  },
  {
    path: "/knox-hub",
    element: (
      <StudentRoute>
        <KnoxHubPage />
      </StudentRoute>
    ),
  },
  {
    path: "/swap-agreement/:swapId",
    element: (
      <StudentRoute>
        <SwapAgreementPage />
      </StudentRoute>
    ),
  },
  {
    path: "/swap-details/:swapId",
    element: (
      <StudentRoute>
        <SwapDetailsPage />
      </StudentRoute>
    ),
  },

  // Shared Routes (Both Students and Admins can access)
  {
    path: "/profile",
    element: (
      <AuthGuard>
        <ProfilePage />
      </AuthGuard>
    ),
  },
  {
    path: "/reputation",
    element: (
      <AuthGuard>
        <ReputationPage />
      </AuthGuard>
    ),
  },
  {
    path: "/calendar",
    element: (
      <AuthGuard>
        <CalendarPage />
      </AuthGuard>
    ),
  },
  {
    path: "/privacy",
    Component: PrivacyPolicyPage,
  },
  {
    path: "/security",
    element: (
      <AuthGuard>
        <SecurityPage />
      </AuthGuard>
    ),
  },
  {
    path: "/report",
    element: (
      <AuthGuard>
        <ReportUserPage />
      </AuthGuard>
    ),
  },
  {
    path: "/leaderboard",
    element: (
      <AuthGuard>
        <LeaderboardPage />
      </AuthGuard>
    ),
  },
  {
    path: "/achievements",
    element: (
      <AuthGuard>
        <AchievementsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/community-forum",
    element: (
      <AuthGuard>
        <CommunityForumPage />
      </AuthGuard>
    ),
  },
  {
    path: "/community-forum/:id",
    element: (
      <AuthGuard>
        <PostDetailsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/notification",
    element: (
      <AuthGuard>
        <NotificationPage />
      </AuthGuard>
    ),
  },
  {
    path: "/activity-timeline",
    element: (
      <AuthGuard>
        <ActivityTimelinePage />
      </AuthGuard>
    ),
  },

  // Protected Admin Routes
  {
    path: "/admin-dashboard",
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <AdminRoute>
        <AnalyticsPage />
      </AdminRoute>
    ),
  },
]);
