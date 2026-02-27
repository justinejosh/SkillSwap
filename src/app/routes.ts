import { createBrowserRouter } from "react-router";
import LoginPage from "@/app/pages/LoginPage";
import SignupPage from "@/app/pages/SignupPage";
import DashboardPage from "@/app/pages/DashboardPage";
import ProfilePage from "@/app/pages/ProfilePage";
import ChatPage from "@/app/pages/ChatPage";
import SwapAgreementPage from "@/app/pages/SwapAgreementPage";
import ReputationPage from "@/app/pages/ReputationPage";
import AdminDashboardPage from "@/app/pages/AdminDashboardPage";
import MarketplacePage from "@/app/pages/MarketplacePage";
import CalendarPage from "@/app/pages/CalendarPage";
import PrivacyPolicyPage from "@/app/pages/PrivacyPolicyPage";
import SecurityPage from "@/app/pages/SecurityPage";
import ReportUserPage from "@/app/pages/ReportUserPage";
import LeaderboardPage from "@/app/pages/LeaderboardPage";
import AchievementsPage from "@/app/pages/AchievementsPage";
import SkillRequestBoardPage from "@/app/pages/SkillRequestBoardPage";
import CommunityForumPage from "@/app/pages/CommunityForumPage";
import ResourceLibraryPage from "@/app/pages/ResourceLibraryPage";
import NotificationCenterPage from "@/app/pages/NotificationCenterPage";
import AnalyticsDashboardPage from "@/app/pages/AnalyticsDashboardPage";
import DisputeResolutionPage from "@/app/pages/DisputeResolutionPage";
import ActivityTimelinePage from "@/app/pages/ActivityTimelinePage";
import MySkillsPage from "@/app/pages/MySkillsPage";

export const router = createBrowserRouter([
  {
    path: "/",
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
    path: "/swap-agreement",
    Component: SwapAgreementPage,
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
    path: "/marketplace",
    Component: MarketplacePage,
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
    path: "/community",
    Component: CommunityForumPage,
  },
  {
    path: "/resources",
    Component: ResourceLibraryPage,
  },
  {
    path: "/notifications",
    Component: NotificationCenterPage,
  },
  {
    path: "/analytics",
    Component: AnalyticsDashboardPage,
  },
  {
    path: "/dispute-resolution",
    Component: DisputeResolutionPage,
  },
  {
    path: "/activity-timeline",
    Component: ActivityTimelinePage,
  },
]);