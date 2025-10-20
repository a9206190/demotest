import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles = [] }) {
  const userData = sessionStorage.getItem("user");

  // ❌ 未登入 → 轉回登入頁
  if (!userData) return <Navigate to="/admin/login" replace />;

  const user = JSON.parse(userData);

  // ❌ 登入但角色不符
  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div style={{ textAlign: "center", padding: "80px" }}>
        <h2>🚫 無權限訪問此頁面</h2>
        <p>目前登入角色：{user.role}</p>
      </div>
    );
  }

  // ✅ 通過驗證，渲染目標頁面
  return children;
}
