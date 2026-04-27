import PreviewPage from "@/app/pages/PreviewPage";
import { createBrowserRouter } from "react-router";
import LoginPage from "@/app/pages/LoginPage";
import SignupPage from "@/app/pages/SignupPage";
import DashboardPage from "@/app/pages/DashboardPage";
import ProfilePage from "@/app/pages/ProfilePage";
import ChatPage from "@/app/pages/ChatPage";
import SwapAgreementPage from "@/app/pages/SwapAgreementPage";
import AgreementSuccessPage from "@/app/pages/AgreementSuccessPage";
import ReputationPage from "@/app/pages/ReputationPage";
import AdminDashboardPage from "@/app/pages/AdminDashboardPage";
import KnoxHubPage from "@/app/pages/KnoxHubPage";
import CalendarPage from "@/app/pages/CalendarPage";
import PrivacyPolicyPage from "@/app/pages/PrivacyPolicyPage";
import SecurityPage from "@/app/pages/SecurityPage";
import ReportUserPage from "@/app/pages/ReportUserPage";
import LeaderboardPage from "@/app/pages/LeaderboardPage";
import AchievementsPage from "@/app/pages/AchievementsPage";
import SkillRequestBoardPage from "@/app/pages/SkillRequestBoardPage";
import CommunityForumPage from "@/app/pages/CommunityForumPage";
import NotificationCenterPage from "@/app/pages/NotificationCenterPage";
import AnalyticsPage from "@/app/pages/AnalyticsPage";
import ActivityTimelinePage from "@/app/pages/ActivityTimelinePage";
import MySkillsPage from "@/app/pages/MySkillsPage";
// 🚀 New Import
import SwapDetailsPage from "@/app/pages/SwapDetailsPage"; 

export const router = createBrowserRouter([
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
  {
    path: "/dashboard",
    Component: DashboardPage,
  },
  {
    path: "/profile",
    Component: ProfilePage,
  },
  {
    path: "/my-skills",
    Component: MySkillsPage,
  },
  {
    path: "/chat",
    Component: ChatPage,
  },
  {
    path: "/swap-agreement/:swapId",
    Component: SwapAgreementPage,
  },
  {
    path: "/swap-details/:swapId",
    Component: SwapDetailsPage,
  },
  {
    path: "/agreement-success",
    Component: AgreementSuccessPage,
  },
  {
    path: "/reputation",
    Component: ReputationPage,
  },
  {
    path: "/admin",
    Component: AdminDashboardPage,
  },
  {
    path: "/knox-hub",
    Component: KnoxHubPage,
  },
  {
    path: "/calendar",
    Component: CalendarPage,
  },
  {
    path: "/privacy",
    Component: PrivacyPolicyPage,
  },
  {
    path: "/security",
    Component: SecurityPage,
  },
  {
    path: "/report",
    Component: ReportUserPage,
  },
  {
    path: "/leaderboard",
    Component: LeaderboardPage,
  },
  {
    path: "/achievements",
    Component: AchievementsPage,
  },
  {
    path: "/skill-requests",
    Component: SkillRequestBoardPage,
  },
  {
    path: "/community-forum",
    Component: CommunityForumPage,
  },
  {
    path: "/requests",
    Component: NotificationCenterPage,
  },
  {
    path: "/analytics",
    Component: AnalyticsPage,
  },
  {
    path: "/activity-timeline",
    Component: ActivityTimelinePage,
  },
]);