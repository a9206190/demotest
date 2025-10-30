import React, { useEffect, useState } from "react";
import styles from "./AgentList.module.css";

export default function AgentList() {
  const API_BASE =
    window.location.hostname === "localhost"
      ? "http://localhost:8000"
      : "https://moneyfast.cc/";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/get_agent_list.php?keyword=${encodeURIComponent(
          keyword
        )}`,
        { credentials: "include" }
      );
      const result = await res.json();
      if (result.success) setData(result.data);
      else console.warn(result.error);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h2>👥 代理商列表</h2>
        <input
          type="text"
          placeholder="搜尋代理商ID / 推薦碼"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            clearTimeout(window._searchTimer);
            window._searchTimer = setTimeout(() => fetchData(e.target.value), 400);
          }}
        />
      </div>

      {loading ? (
        <p>讀取中...</p>
      ) : data.length === 0 ? (
        <p>目前沒有代理商資料。</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>代理商ID</th>
              <th>姓名</th>
              <th>電話</th>
              <th>推薦碼</th>
              <th>客戶數</th>
              <th>業務數</th>
              <th>應收帳款</th>
              <th>實質業績</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.agent_id}</td>
                <td>{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.referral_code}</td>
                <td>{row.customer_count}</td>
                <td>{row.business_count}</td>
                <td>${Number(row.receivable_amount).toLocaleString()}</td>
                <td>${Number(row.total_performance).toLocaleString()}</td>
                <td>
                  <button
                    className={styles.detailBtn}
                    onClick={() => alert("詳細頁面開發中")}
                  >
                    🔍 詳細
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
