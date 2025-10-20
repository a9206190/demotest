import React from "react";
import styles from "../dashboard/Admin_Dashboard.module.css";

export default function Admin_Overview() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  return (
    <div className={styles.mainContent}>
      <h2>🔍 總覽查詢</h2>
      <p>歡迎 {user.name || "使用者"}（{user.role || "角色"}）</p>
      <hr />
      <p>這裡可以統一查詢所有核貸與聯絡紀錄的統計資料。</p>
      <div className={styles.placeholder}>
        <p>📊 查詢介面建置中...</p>
      </div>
    </div>
  );
}
