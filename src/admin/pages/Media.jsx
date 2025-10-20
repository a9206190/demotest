import React from "react";
import styles from "../dashboard/Admin_Dashboard.module.css";

export default function Admin_Media() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  return (
    <div className={styles.mainContent}>
      <h2>🖼️ 媒體管理</h2>
      <p>歡迎 {user.name || "使用者"}（{user.role || "角色"}）</p>
      <hr />
      <p>這裡可上傳、瀏覽或刪除網站圖片與檔案。</p>
      <div className={styles.placeholder}>
        <p>📂 媒體功能開發中...</p>
      </div>
    </div>
  );
}
