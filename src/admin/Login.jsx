// ==================================================
// Login.jsx — 智慧登入頁（自動環境偵測 + 集成 API + 已登入自動導向）
// ==================================================
import React, { useState, useEffect } from "react";
import styles from "./Login.module.css";
import { API, fetchAPI } from "@config/apiConfig";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ==================================================
  // ✅ Step 1: 如果已登入（session 還有效）→ 自動跳轉
  // ==================================================
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetchAPI(API.GET_ADMIN_STATUS);
        if (res.loggedIn && res.user) {
          redirectByRole(res.user.role);
        }
      } catch (err) {
        console.warn("⚠️ 檢查登入狀態失敗：", err);
      }
    };
    checkSession();
  }, []);

  // ==================================================
  // ✅ Step 2: 根據角色導向對應頁面
  // ==================================================
  const redirectByRole = (role) => {
    const isDemo = window.location.pathname.includes("/demo");
    const prefix = isDemo ? "/demo/admin" : "/admin";
    let path = `${prefix}/dashboard`;

    switch (role) {
      case "Admin":
      case "SAdmin":
        path = `${prefix}/dashboard`;
        break;
      case "BAdmin":
        path = `${prefix}/business`;
        break;
      case "GAdmin":
        path = `${prefix}/agent`;
        break;
      default:
        path = `${prefix}/login`;
    }

    // ✅ 改這裡 — 改成直接使用相對路徑導向
    window.location.href = path;
  };

  // ==================================================
  // ✅ Step 3: 登入事件
  // ==================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("⚠️ 請輸入帳號與密碼");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(API.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ 保留 cookie
        body: JSON.stringify({ username, password }),
      });

      let result;
      try {
        result = await res.clone().json();
      } catch {
        const rawText = await res.text();
        console.error("⚠️ 伺服器回傳非 JSON：", rawText.slice(0, 200));
        throw new Error("伺服器回傳非 JSON：" + rawText.slice(0, 80));
      }

      if (result.success) {
        sessionStorage.setItem("user", JSON.stringify(result.user));
        alert("✅ 登入成功，正在導向主控台...");

        // ✅ 改這裡 — 安全判斷 redirect 是否完整 URL
        const redirectPath = result.redirect || null;

        if (redirectPath) {
          if (redirectPath.startsWith("http")) {
            window.location.href = redirectPath; // ✅ 完整網址（如後端已給 https://...）
          } else {
            window.location.href = redirectPath; // ✅ 相對路徑
          }
        } else {
          redirectByRole(result.user.role);
        }
      } else {
        setErrorMsg("❌ 登入失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("❌ Login Error:", err);
      setErrorMsg("❌ 系統錯誤：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // ✅ Step 4: UI
  // ==================================================
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2 className={styles.title}>管理後台登入</h2>

        <form onSubmit={handleLogin}>
          <label>帳號：</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="請輸入帳號"
            className={styles.input}
          />

          <label>密碼：</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入密碼"
            className={styles.input}
          />

          <button type="submit" className={styles.loginBtn} disabled={loading}>
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}
        <p className={styles.hint}>僅限授權管理員登入使用</p>
      </div>
    </div>
  );
}
