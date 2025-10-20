import React, { useState } from "react";
import styles from "./Login.module.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("⚠️ 請輸入帳號與密碼");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/src/admin/api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // ✅ 帶上 Cookie / Session
      });

      const result = await res.json();

      if (result.success) {
        // ✅ 記錄使用者資料到 sessionStorage
        sessionStorage.setItem("user", JSON.stringify(result.user));
        alert("✅ 登入成功，正在導向主控台...");
        window.location.href = "/admin/dashboard";
      } else {
        setErrorMsg("❌ 登入失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("Login Error:", err);
      setErrorMsg("❌ 系統錯誤：" + err.message);
    } finally {
      setLoading(false);
    }
  };

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
