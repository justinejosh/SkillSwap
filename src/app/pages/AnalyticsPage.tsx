import { Navigate } from "react-router";
// Preserve the existing ADMIN-guarded deep link while using the shared console.
export default function AnalyticsPage(){return <Navigate to="/admin-dashboard?section=analytics" replace/>;}
