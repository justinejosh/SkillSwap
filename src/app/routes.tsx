import { createBrowserRouter, Navigate } from "react-router";

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
import PostDetailsPage from "@/app/pages/PostDetailsPage"; // 🚀 NEW IMPORT
import NotificationCenterPage from "@/app/pages/NotificationCenterPage";
import AnalyticsPage from "@/app/pages/AnalyticsPage";
import ActivityTimelinePage from "@/app/pages/ActivityTimelinePage";
import MySkillsPage from "@/app/pages/MySkillsPage";
import SwapDetailsPage from "@/app/pages/SwapDetailsPage"; 

// This guard checks if the user is an admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const userString = localStorage.getItem("knoxite_user");
  
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user.role === "ADMIN") {
        return <>{children}</>;
      }
    } catch (e) {
      console.error("Error reading user data", e);
    }
  }
  
  // Send normal users back to the dashboard
  return <Navigate to="/dashboard" replace />;
};

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
    path: "/reputation",
    Component: ReputationPage,
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
    path: "/community-forum",
    Component: CommunityForumPage,
  },
  {
    // 🚀 NEW ROUTE
    path: "/community-forum/:id",
    Component: PostDetailsPage,
  },
  {
    path: "/requests",
    Component: NotificationCenterPage,
  },
  {
    path: "/activity-timeline",
    Component: ActivityTimelinePage,
  },
  // Protected Admin Routes below
  {
    path: "/admin-dashboard",
    element: <AdminRoute><AdminDashboardPage /></AdminRoute>,
  },
  {
    path: "/analytics",
    element: <AdminRoute><AnalyticsPage /></AdminRoute>,
  },
]); 