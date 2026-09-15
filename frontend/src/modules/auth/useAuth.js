import { useAuthContext } from "../../shared/AuthContext";

// Hook tiện ích: trả về user + các cờ quyền theo role.
// Ma trận quyền chi tiết nằm ở backend/core/permissions.py.
export function useAuth() {
  const { user, loading, login, logout, setUser, refreshUser } =
    useAuthContext();

  const role = user?.role || null;
  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const isUser = role === "user";
  const isViewer = role === "viewer";

  // admin & moderator được sửa/xoá nội dung; user chỉ sửa của mình; viewer chỉ xem.
  const canEdit = isAdmin || isModerator || isUser;
  const canDelete = isAdmin || isModerator;
  const canCreate = isAdmin || isModerator || isUser;
  const canManageUsers = isAdmin;
  // Quyền duyệt đăng ký: admin luôn có; moderator cần cờ can_approve.
  const canApprove = isAdmin || (isModerator && !!user?.can_approve);

  return {
    user,
    loading,
    role,
    isAdmin,
    isModerator,
    isUser,
    isViewer,
    canEdit,
    canDelete,
    canCreate,
    canManageUsers,
    canApprove,
    login,
    logout,
    setUser,
    refreshUser,
  };
}

export default useAuth;
