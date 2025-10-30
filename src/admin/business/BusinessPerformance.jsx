// ==================================================
// BusinessPerformance.jsx — 業務端業績查詢頁
// ==================================================
import React, { useEffect, useState } from "react";
import styles from "./BusinessPerformance.module.css";
import { API, fetchAPI } from "@config/apiConfig";

export default function BusinessPerformance({ businessId }) {
  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("year"); // year | month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  // ✅ 載入資料
  const fetchPerformance = async (searchTerm = "") => {
    if (!businessId) return;
    setLoading(true);
    setError("");

    const url = `${API.GET_BUSINESS_PERFORMANCE}?business_id=${businessId}&search=${encodeURIComponent(
      searchTerm
    )}&mode=${viewMode}&year=${selectedYear}&month=${selectedMonth}`;

    const res = await fetchAPI(url);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || "讀取失敗");
    }
    setLoading(false);
  };

  // 首次載入
  useEffect(() => {
    fetchPerformance();
  }, [businessId, viewMode, selectedYear, selectedMonth]);

  // 即時搜尋（防抖）
  useEffect(() => {
    const timer = setTimeout(() => fetchPerformance(keyword), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 匯出 CSV
  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = ["客戶姓名", "電話", "應收帳款", "實質業績", "呆帳"];
    const rows = data.map((d) => [
      d.name,
      d.phone,
      d.receivable_amount,
      d.actual_revenue,
      d.bad_debt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute(
      "download",
      `business_performance_${selectedYear}${
        viewMode === "month" ? `_${selectedMonth}` : ""
      }.csv`
    );
    link.setAttribute("href", encodedUri);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📈 業績查詢</h2>

      <div className={styles.controls}>
        <div className={styles.viewMode}>
          <button
            className={viewMode === "year" ? styles.active : ""}
            onClick={() => setViewMode("year")}
          >
            年度
          </button>
          <button
            className={viewMode === "month" ? styles.active : ""}
            onClick={() => setViewMode("month")}
          >
            月度
          </button>
        </div>

        <div className={styles.selector}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              )
            )}
          </select>

          {viewMode === "month" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
          )}
        </div>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜尋客戶姓名或電話..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <button onClick={exportCSV} className={styles.exportBtn}>
          ⬇ 匯出 CSV
        </button>
      </div>

      {loading ? (
        <p className={styles.status}>載入中...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : data.length === 0 ? (
        <p className={styles.status}>目前無資料</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>客戶姓名</th>
              <th>電話</th>
              <th>應收帳款</th>
              <th>實質業績</th>
              <th>呆帳</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>${c.receivable_amount?.toLocaleString() || 0}</td>
                <td>${c.actual_revenue?.toLocaleString() || 0}</td>
                <td
                  className={
                    c.bad_debt > 0 ? styles.badDebt : styles.noBadDebt
                  }
                >
                  ${c.bad_debt?.toLocaleString() || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
