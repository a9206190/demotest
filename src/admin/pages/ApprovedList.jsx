import React, { useEffect, useState } from "react";
import styles from "./ApprovedList.module.css";
import API, { fetchAPI } from "@config/apiConfig"; // ✅ 使用統一 API 設定

export default function ApprovedList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  // 📦 讀取已核准案件
  const fetchApproved = async (search = "") => {
    setLoading(true);
    try {
      const url = `${API.LOAN_MANAGE}?action=list${
        search ? `&keyword=${encodeURIComponent(search)}` : ""
      }`;

      console.log("📡 已核貸 fetch URL：", url);

      const result = await fetchAPI(url);
      if (result.success) {
        // ✅ 過濾出已核准的案件
        const approvedList = result.data.filter(
          (row) => row.loan_status === "已核准"
        );
        setData(approvedList);
      } else {
        alert("❌ 載入失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("❌ Fetch 失敗:", err);
      alert("伺服器連線失敗");
    }
    setLoading(false);
  };

  // 初次載入
  useEffect(() => {
    fetchApproved();
  }, []);

  // 🔍 搜尋（延遲執行）
  const handleSearchInput = (value) => {
    setKeyword(value);
    clearTimeout(window.searchTimer);
    window.searchTimer = setTimeout(() => fetchApproved(value), 400);
  };

  // 匯出所有「已核准」案件 Excel
  const exportExcel = () => {
    const url = `${API.EXPORT_ALL_EXCEL}?status=已核准`;
    window.open(url, "_blank");
  };

  // 匯出單筆
  const exportSingle = (id) => {
    const url = `${API.EXPORT_EXCEL}?id=${id}`;
    window.open(url, "_blank");
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h2>📋 已核貸列表</h2>
        <button className={styles.exportBtn} onClick={exportExcel}>
          ⬇ 匯出 Excel
        </button>
      </div>

      {/* 搜尋列 */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="搜尋姓名、電話或申請編號..."
          value={keyword}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <p>讀取中...</p>
      ) : data.length === 0 ? (
        <p>目前沒有已核貸的案件。</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>申請編號</th>
              <th>姓名</th>
              <th>電話</th>
              <th>金額</th>
              <th>建立日期</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.application_no}</td>
                <td>{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.installment_amount || "-"}</td>
                <td>{row.apply_date || "-"}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles.approved}`}>
                    {row.loan_status}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.fileBtn}
                    onClick={() => exportSingle(row.id)}
                  >
                    📄 匯出單筆
                  </button>
                  <button
                    className={styles.editBtn}
                    onClick={() => alert("詳細頁面開發中")}
                  >
                    🔍 檢視
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
