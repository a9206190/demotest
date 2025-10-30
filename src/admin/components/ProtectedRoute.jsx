import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { API, fetchAPI } from "@config/apiConfig";

export default function ProtectedRoute({ children, roles = [] }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // 向後端確認 session 是否有效
        const res = await fetchAPI(API.CHECK_SESSION);

        if (res.loggedIn && res.user) {
          // ✅ 有效登入 → 儲存至 sessionStorage（同步狀態）
          sessionStorage.setItem("user", JSON.stringify(res.user));

          // ✅ 角色驗證
          if (roles.length === 0 || roles.includes(res.user.role)) {
            setUser(res.user);
            setAuthorized(true);
          } else {
            setUser(res.user);
            setAuthorized(false);
          }
        } else {
          // ❌ 未登入
          sessionStorage.removeItem("user");
          setAuthorized(false);
        }
      } catch (err) {
        console.error("❌ Session 檢查失敗:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [roles]);

  if (loading) {
    return null; // 或者顯示 Loading...
  }

  // ❌ 未登入 → 導回登入頁
  if (!authorized && !user) {
    return <Navigate to="/admin/login" replace />;
  }

  // ❌ 登入但角色不符
  if (!authorized && user) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "100px 20px",
          color: "#ccc",
          backgroundColor: "#1b1f23",
          minHeight: "100vh",
          fontFamily: "Noto Sans TC, sans-serif",
        }}
      >
        <h2 style={{ color: "#ff6666", marginBottom: "12px" }}>🚫 無權限訪問此頁面</h2>
        <p>
          目前登入角色：<strong>{user.role}</strong>
        </p>
        <p>
          允許的角色：<strong>{roles.join(", ")}</strong>
        </p>
        <div style={{ marginTop: "20px" }}>
          <Link
            to="/admin/login"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: "8px",
              backgroundColor: "#00c49f",
              color: "#111",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            返回登入頁
          </Link>
        </div>
      </div>
    );
  }

  // ✅ 通過驗證，渲染目標頁面
  return children;
}
