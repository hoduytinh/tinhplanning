import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./shared/components/Layout";
import ProtectedRoute from "./shared/ProtectedRoute";
import DashboardPage from "./modules/dashboard/DashboardPage";
import TaskPage from "./modules/tasks/TaskPage";
import ProjectPage from "./modules/projects/ProjectPage";
import ProjectDetailPage from "./modules/projects/ProjectDetailPage";
import MeetingPage from "./modules/meetings/MeetingPage";
import MeetingDetailPage from "./modules/meetings/MeetingDetailPage";
import TemplateListPage from "./modules/meetings/TemplateListPage";
import TemplateEditor from "./modules/meetings/TemplateEditor";
import WeeklyReviewPage from "./modules/weekly-review/WeeklyReviewPage";
import WeeklyReviewDetail from "./modules/weekly-review/WeeklyReviewDetail";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";
import PendingPage from "./modules/auth/PendingPage";
import UserManagementPage from "./modules/users/UserManagementPage";
import ProfilePage from "./modules/users/ProfilePage";

export default function App() {
  return (
    <Routes>
      {/* Public auth routes (full-screen, ngoài Layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pending" element={<PendingPage />} />

      {/* Protected app routes (cần đăng nhập, trong Layout) */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/tasks" element={<TaskPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/meetings" element={<MeetingPage />} />
                <Route path="/meetings/:id" element={<MeetingDetailPage />} />
                <Route
                  path="/meeting-templates"
                  element={<TemplateListPage />}
                />
                <Route
                  path="/meeting-templates/new"
                  element={<TemplateEditor />}
                />
                <Route
                  path="/meeting-templates/:id/edit"
                  element={<TemplateEditor />}
                />
                <Route path="/weekly-review" element={<WeeklyReviewPage />} />
                <Route
                  path="/weekly-review/:id"
                  element={<WeeklyReviewDetail />}
                />
                <Route path="/settings/profile" element={<ProfilePage />} />
                <Route
                  path="/settings/users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <UserManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
