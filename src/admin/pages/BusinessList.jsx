// ==================================================
// BusinessList.jsx — 管理員業務列表 + 排班系統 Modal + 匯出 / 新增排班
// ==================================================
import React, { useEffect, useState } from "react";
import styles from "./BusinessList.module.css";
import { API, fetchAPI } from "@config/apiConfig";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from "date-fns/locale";

export default function BusinessList() {
  // === 業務列表 ===
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // === 排班系統 ===
  const [showModal, setShowModal] = useState(false);
  const [shiftData, setShiftData] = useState([]);
  const [filteredShiftData, setFilteredShiftData] = useState([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftSearch, setShiftSearch] = useState("");

  // === 新增排班 Modal ===
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBusinessId, setAddBusinessId] = useState("");
  const [addShiftDate, setAddShiftDate] = useState(new Date());
  const [addWorkShift, setAddWorkShift] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // === 業務清單（下拉選單用）===
  const [businessList, setBusinessList] = useState([]);

  // === 載入資料 ===
  useEffect(() => {
    fetchData();
    fetchBusinessList();
  }, []);

  const fetchData = async (keyword = "") => {
    setLoading(true);
    const url = `${API.GET_BUSINESS_LIST}?keyword=${encodeURIComponent(keyword)}`;
    const result = await fetchAPI(url);
    if (result.success) setData(result.data);
    else console.warn(result.error);
    setLoading(false);
  };

  const fetchBusinessList = async () => {
    const result = await fetchAPI(API.GET_BUSINESS_LIST);
    if (result.success) setBusinessList(result.data);
  };

  // === 載入所有排班資料 ===
  const loadShiftData = async () => {
    setShiftLoading(true);
    const result = await fetchAPI(API.GET_ALL_BUSINESS_SHIFTS);
    if (result.success) {
      setShiftData(result.data);
      setFilteredShiftData(result.data);
    } else console.error(result.error);
    setShiftLoading(false);
  };

  // === 搜尋過濾（Modal 內）===
  useEffect(() => {
    if (!shiftSearch.trim()) {
      setFilteredShiftData(shiftData);
    } else {
      const keyword = shiftSearch.trim().toLowerCase();
      setFilteredShiftData(
        shiftData.filter(
          (r) =>
            (r.business_name && r.business_name.toLowerCase().includes(keyword)) ||
            (r.shift_date && r.shift_date.includes(keyword))
        )
      );
    }
  }, [shiftSearch, shiftData]);

  // === 時段對應 ===
  const getShiftTime = (shift) => {
    const map = {
      早班: "10:00–18:00",
      午班: "18:00–02:00",
      晚班: "02:00–10:00",
    };
    return map[shift] || "-";
  };

  // === 匯出 CSV ===
  const exportCSV = () => {
    if (filteredShiftData.length === 0) {
      alert("目前沒有可匯出的資料！");
      return;
    }

    const header = ["日期", "班別", "時段", "業務ID", "業務姓名", "建立時間"];
    const rows = filteredShiftData.map((r) => [
      r.shift_date,
      r.work_shift,
      getShiftTime(r.work_shift),
      r.business_id,
      r.business_name || "-",
      r.created_at,
    ]);

    const csvContent =
      "\uFEFF" +
      [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 12);
    const link = document.createElement("a");
    link.href = url;
    link.download = `business_shifts_${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // === 新增排班 ===
  const handleAddShift = async () => {
    if (!addBusinessId || !addShiftDate || !addWorkShift) {
      setMessage("⚠️ 請完整填寫所有欄位！");
      return;
    }

    setSaving(true);
    setMessage("");
    const payload = {
      business_id: addBusinessId,
      shift_date: addShiftDate.toISOString().split("T")[0],
      work_shift: addWorkShift,
    };

    const result = await fetchAPI(API.UPDATE_BUSINESS_SHIFT, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (result.success) {
      setMessage("✅ 排班新增成功！");
      setShowAddModal(false);
      loadShiftData();
      setAddBusinessId("");
      setAddWorkShift("");
    } else {
      setMessage("❌ 新增失敗：" + result.error);
    }
    setSaving(false);
  };
  // === 刪除排班 ===
  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("確定要刪除此排班嗎？")) return;

    const result = await fetchAPI(API.DELETE_BUSINESS_SHIFT, {
      method: "POST",
      body: JSON.stringify({ id: shiftId }),
    });

    if (result.success) {
      alert("🗑️ 已刪除排班！");
      loadShiftData(); // 重新載入排班資料
    } else {
      alert("❌ 刪除失敗：" + (result.error || "未知錯誤"));
    }
  };


  return (
    <div className={styles.container}>
      {/* === 標題與搜尋列 === */}
      <div className={styles.topBar}>
        <div className={styles.titleRow}>
          <h2>🏢 業務列表</h2>
          <button
            className={styles.shiftButton}
            onClick={() => {
              setShowModal(true);
              loadShiftData();
            }}
          >
            🕒 排班系統
          </button>
        </div>

        <input
          type="text"
          placeholder="搜尋業務ID / 推薦碼"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            clearTimeout(window._searchTimer);
            window._searchTimer = setTimeout(() => fetchData(e.target.value), 400);
          }}
        />
      </div>

      {/* === 業務列表 === */}
      {loading ? (
        <p>讀取中...</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>業務ID</th>
              <th>姓名</th>
              <th>電話</th>
              <th>推薦碼</th>
              <th>客戶數</th>
              <th>代理商數</th>
              <th>應收帳款</th>
              <th>實質業績</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.business_id}</td>
                <td>{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.referral_code}</td>
                <td>{row.customer_count}</td>
                <td>{row.agent_count}</td>
                <td>${Number(row.receivable_amount).toLocaleString()}</td>
                <td>${Number(row.total_performance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* === Modal: 排班系統 === */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>🕒 所有業務排班</h3>
            <button className={styles.closeButton} onClick={() => setShowModal(false)}>
              ✖
            </button>

            <div className={styles.modalTopRow}>
              <input
                type="text"
                placeholder="搜尋業務姓名 或 日期（例如 2025-10-27）"
                value={shiftSearch}
                onChange={(e) => setShiftSearch(e.target.value)}
              />

              <div className={styles.buttonGroup}>
                <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
                  ➕ 新增排班
                </button>
                <button className={styles.exportButton} onClick={exportCSV}>
                  📤 匯出 CSV
                </button>
              </div>
            </div>

            {shiftLoading ? (
              <p>讀取中...</p>
            ) : (
              <table className={styles.shiftTable}>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>班別</th>
                    <th>時段</th>
                    <th>業務ID</th>
                    <th>業務姓名</th>
                    <th>建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShiftData.map((r) => (
                    <tr key={r.id}>
                      <td>{r.shift_date}</td>
                      <td>{r.work_shift}</td>
                      <td>{getShiftTime(r.work_shift)}</td>
                      <td>{r.business_id}</td>
                      <td>{r.business_name || "-"}</td>
                      <td>
                        {r.created_at}
                        <button
                          onClick={() => handleDeleteShift(r.id)}
                          style={{
                            marginLeft: "10px",
                            background: "none",
                            border: "none",
                            color: "red",
                            cursor: "pointer",
                            fontSize: "16px",
                          }}
                          title="刪除此排班"
                        >
                          🗑️ 刪除班別
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === Modal: 新增排班 === */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>➕ 新增業務排班</h3>
            <button className={styles.closeButton} onClick={() => setShowAddModal(false)}>
              ✖
            </button>

            <div className={styles.formGroup}>
              <label>選擇業務：</label>
              <select
                value={addBusinessId}
                onChange={(e) => setAddBusinessId(e.target.value)}
              >
                <option value="">請選擇業務</option>
                {businessList.map((b) => (
                  <option key={b.business_id} value={b.business_id}>
                    {b.name}（ID: {b.business_id}）
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>日期：</label>
              <DatePicker
                selected={addShiftDate}
                onChange={(date) => setAddShiftDate(date)}
                locale={zhTW}
                dateFormat="yyyy-MM-dd"
                className={styles.dateInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label>班別：</label>
              <select
                value={addWorkShift}
                onChange={(e) => setAddWorkShift(e.target.value)}
              >
                <option value="">請選擇</option>
                <option value="早班">早班（10:00–18:00）</option>
                <option value="午班">午班（18:00–02:00）</option>
                <option value="晚班">晚班（02:00–10:00）</option>
              </select>
            </div>

            <div className={styles.modalButtons}>
              <button className={styles.saveButton} onClick={handleAddShift} disabled={saving}>
                {saving ? "儲存中..." : "💾 儲存"}
              </button>
              <button className={styles.cancelButton} onClick={() => setShowAddModal(false)}>
                取消
              </button>
            </div>

            {message && <p className={styles.message}>{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
