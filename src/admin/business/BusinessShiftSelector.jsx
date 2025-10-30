// ==================================================
// BusinessShiftSelector.jsx — 業務端只讀版（無新增功能）
// ==================================================
import React, { useState, useEffect } from "react";
import styles from "./BusinessShiftSelector.module.css";
import { API, fetchAPI } from "@config/apiConfig";

export default function BusinessShiftSelector({ businessId }) {
  const [records, setRecords] = useState([]);
  const [todayShift, setTodayShift] = useState("");
  const [loading, setLoading] = useState(false);
  const [_message, setMessage] = useState("");

  // ✅ 班別時間對應（不改資料庫）
  const shiftTimes = {
    早班: "10:00–18:00",
    午班: "18:00–02:00",
    晚班: "02:00–10:00",
  };

  const today = new Date().toISOString().split("T")[0];

  // ✅ 載入排班紀錄
  const loadShiftData = async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await fetchAPI(`${API.GET_BUSINESS_SHIFT}?id=${businessId}`);
    if (res.success) {
      setRecords(res.records || []);
      const found = res.records.find((r) => r.shift_date === today);
      setTodayShift(
        found ? `${found.work_shift}（${shiftTimes[found.work_shift] || "-"}）` : ""
      );
    } else {
      setMessage("❌ 載入失敗：" + (res.error || "未知錯誤"));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadShiftData();
  }, [businessId]);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>🕒 今日上班時段：</h2>
        <span className={todayShift ? styles.todayShift : styles.noShift}>
          {todayShift || "尚未設定"}
        </span>
      </div>

      <p className={styles.notice}>※ 此排班由管理員設定，業務無法自行修改。</p>

      <div className={styles.tableSection}>
        <h3>📅 最近排班紀錄</h3>
        {loading ? (
          <p>載入中...</p>
        ) : records.length === 0 ? (
          <p>目前沒有排班紀錄</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>日期</th>
                <th>班別</th>
                <th>時段</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={i}
                  className={
                    r.shift_date === today ? styles.todayRow : styles.normalRow
                  }
                >
                  <td>{r.shift_date}</td>
                  <td>{r.work_shift}</td>
                  <td>{shiftTimes[r.work_shift] || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
