// ==================================================
// BusinessAgentList.jsx — 業務端代理商列表（深色新版）
// ==================================================
import React, { useState, useEffect } from "react";
import styles from "./BusinessAgentList.module.css";
import { API, fetchAPI } from "@config/apiConfig";

export default function BusinessAgentList({ businessId }) {
  const [agents, setAgents] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ 載入代理商列表
  const fetchAgents = async (searchTerm = "") => {
    if (!businessId) return;
    setLoading(true);
    setError("");

    const url = `${API.GET_BUSINESS_AGENTS}?business_id=${businessId}&search=${encodeURIComponent(
      searchTerm
    )}`;
    const data = await fetchAPI(url);

    if (data.success) {
      setAgents(data.data);
    } else {
      setError(data.error || "讀取失敗");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
  }, [businessId]);

  // 🔍 即時搜尋（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAgents(keyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🤝 我的代理商列表</h2>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="輸入代理商姓名或 ID..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles.status}>載入中...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : agents.length === 0 ? (
        <p className={styles.status}>目前尚無代理商紀錄</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>代理商 ID</th>
                <th>代理商名稱</th>
                <th>申請案件數</th>
                <th>最近申請日期</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.agent_id}>
                  <td>{a.agent_id}</td>
                  <td>{a.agent_name || "-"}</td>
                  <td>{a.app_count}</td>
                  <td>{a.last_apply_date || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
