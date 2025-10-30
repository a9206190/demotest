// ==================================================
// Agent_Customers.jsx — 代理商端 客戶列表（以 session/referral_code 查詢）
// ==================================================
import React, { useEffect, useState } from "react";
import styles from "./AgentCustomersList.module.css";
import { API, fetchAPI } from "@config/apiConfig";
import { useNavigate } from "react-router-dom";

export default function Agent_Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const navigate = useNavigate();

  // ✅ 從 session 取登入資料
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const referralCode = user?.referral_code || "";
  const userName = user?.name || "";

  useEffect(() => {
    if (!userName && !referralCode) {
      alert("⚠️ 無法取得登入資訊，請重新登入。");
      navigate("/admin/login");
      return;
    }
    loadCustomers();
  }, []);

  // ✅ 載入客戶資料
  const loadCustomers = async () => {
    setLoading(true);

    // 後端根據 session 自動判斷，不需 referral_code
    const url = `${API.GET_AGENT_CUSTOMERS}?search=${encodeURIComponent(search)}`;

    const result = await fetchAPI(url, {
      method: "GET",
      credentials: "include",
    });

    if (result.success) {
      setCustomers(result.data);
      setFiltered(result.data);
    } else {
      alert("❌ 無法取得客戶列表：" + (result.error || "伺服器錯誤"));
    }
    setLoading(false);
  };

  // === 搜尋與篩選 ===
  useEffect(() => {
    let filteredData = customers;

    if (search.trim() !== "") {
      const keyword = search.trim().toLowerCase();
      filteredData = filteredData.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(keyword)) ||
          (c.phone && c.phone.includes(keyword))
      );
    }

    if (statusFilter !== "全部") {
      filteredData = filteredData.filter((c) => c.status === statusFilter);
    }

    setFiltered(filteredData);
  }, [search, statusFilter, customers]);

  const getStatusClass = (status) => {
    if (!status) return styles.statusTag;
    if (status.includes("審核") || status === "待審核")
      return `${styles.statusTag} ${styles.pending}`;
    if (status.includes("核准") || status === "已核准" || status === "已撥款")
      return `${styles.statusTag} ${styles.approved}`;
    if (status.includes("拒絕") || status === "已拒絕")
      return `${styles.statusTag} ${styles.rejected}`;
    return styles.statusTag;
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2>👥 我的推薦客戶</h2>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="搜尋姓名或電話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="全部">全部狀態</option>
          <option value="審核中">審核中</option>
          <option value="已核准">已核准</option>
          <option value="已撥款">已撥款</option>
          <option value="已拒絕">已拒絕</option>
        </select>
        <button className={styles.reloadBtn} onClick={loadCustomers}>
          🔄 重新整理
        </button>
      </div>

      {loading ? (
        <p>讀取中...</p>
      ) : filtered.length === 0 ? (
        <p>尚無符合條件的客戶資料</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>電話</th>
                <th>貸款金額</th>
                <th>狀態</th>
                <th>所屬業務</th>
                <th>申請日期</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>
                    {c.loan_amount
                      ? `$${Number(c.loan_amount).toLocaleString()}`
                      : "—"}
                  </td>
                  <td>
                    <span className={getStatusClass(c.status)}>
                      {c.status || "—"}
                    </span>
                  </td>
                  <td>{c.business_name || "—"}</td>
                  <td>{c.apply_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
