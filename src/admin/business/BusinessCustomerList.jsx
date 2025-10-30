// ==================================================
// BusinessCustomerList.jsx — 業務端客戶列表（深色新版）
// ==================================================
import React, { useEffect, useState } from "react";
import styles from "./BusinessCustomerList.module.css";
import { API, fetchAPI } from "@config/apiConfig";

export default function BusinessCustomerList({ businessId }) {
  const [customers, setCustomers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ 載入客戶資料
  const fetchCustomers = async (searchTerm = "") => {
    if (!businessId) return;
    setLoading(true);
    setError("");

    const url = `${API.GET_BUSINESS_CUSTOMERS}?business_id=${businessId}&search=${encodeURIComponent(
      searchTerm
    )}`;
    const data = await fetchAPI(url);

    if (data.success) {
      setCustomers(data.data);
    } else {
      setError(data.error || "讀取失敗");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [businessId]);

  // 🔍 即時搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(keyword);
    }, 400); // 輕微防抖
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📋 客戶申請列表</h2>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="輸入姓名或電話以搜尋..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {loading ? (
        <p className={styles.status}>載入中...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : customers.length === 0 ? (
        <p className={styles.status}>尚無客戶申請紀錄</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>申請編號</th>
                <th>姓名</th>
                <th>電話</th>
                <th>申請日期</th>
                <th>狀態</th>
                <th>代理商</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.application_no}</td>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.apply_date}</td>
                  <td>
                    <span
                      className={`${styles.statusTag} ${
                        c.loan_status === "待審核"
                          ? styles.pending
                          : c.loan_status === "核准"
                          ? styles.approved
                          : styles.rejected
                      }`}
                    >
                      {c.loan_status}
                    </span>
                  </td>
                  <td>{c.agent_name || "無"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
