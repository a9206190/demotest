import React, { useEffect, useState } from "react";
import styles from "./Business_Dashboard.module.css";
import API from "@config/apiConfig";

// 匯入子頁面
import BusinessShiftSelector from "../business/BusinessShiftSelector";
import BusinessCustomerList from "../business/BusinessCustomerList";
import BusinessAgentList from "../business/BusinessAgentList";
import BusinessPerformance from "../business/BusinessPerformance";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function BusinessDashboard() {
  const [business, setBusiness] = useState(null);
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    email: "",
    line_id: "",
    new_password: "",
  });

  const COLORS = ["#00C49F", "#FFBB28", "#FF8042"];

  // 📱 禁止手機訪問
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 📦 載入業務資料
  useEffect(() => {
    fetch(API.GET_BUSINESS_LIST, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const myData = data.data[0];
          setBusiness(myData);
          setEditData({
            name: myData.name || "",
            phone: myData.phone || "",
            email: myData.email || "",
            line_id: myData.line_id || "",
          });
          setClients(myData.clients || []);
          setStats({
            totalCommission: myData.total_commission || 0,
            monthlyCommission: myData.monthly_commission || 0,
            loanCount: myData.loan_count || 0,
            referralCount: myData.referral_count || 0,
          });
        } else {
          setError(data.error || "無法取得業務資料");
        }
      })
      .catch((err) => setError("伺服器錯誤：" + err))
      .finally(() => setLoading(false));
  }, []);

  // 🔔 模擬公告
  useEffect(() => {
    setAnnouncements([
      { id: 1, title: "系統維護通知", date: "2025-10-25", content: "系統將於 10/28 凌晨 2:00 進行維護，請提前保存資料。" },
      { id: 2, title: "佣金制度更新", date: "2025-10-15", content: "新的佣金分潤方案已上線，詳見公告區。" },
    ]);
  }, []);

  // === 操作函式 ===
  const handleExport = () => window.open(API.EXPORT_ALL_EXCEL, "_blank");
  const handleManageDownline = () => alert("即將開啟下線管理功能（開發中）");

  const handleLogout = async () => {
    try {
      const res = await fetch(API.LOGOUT, { method: "POST", credentials: "include" });
      const data = await res.json();

      if (data.success) {
        sessionStorage.removeItem("user");
        const currentPath = window.location.pathname;
        const isInDemo = currentPath.startsWith("/demo");
        const redirectURL = `${window.location.origin}${isInDemo ? "/demo" : ""}/admin/login`;
        window.location.href = redirectURL;
      } else {
        alert(data.error || "登出失敗，請稍後再試");
      }
    } catch (err) {
      console.error("❌ 登出錯誤：", err);
      alert("伺服器錯誤，請稍後再試");
    }
  };

  const handleEditProfile = () => setShowModal(true);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      const filtered = Object.fromEntries(Object.entries(editData).filter(([, v]) => v !== ""));
      const payload = { ...filtered, business_id: business.business_id };

      const res = await fetch(API.UPDATE_BUSINESS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ 更新成功！");
        setBusiness((prev) => ({ ...prev, ...data.data }));
        setShowModal(false);
      } else {
        alert("❌ 更新失敗：" + (data.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("❌ 更新錯誤：", err);
      alert("伺服器錯誤：" + err.message);
    }
  };

  // 🧩 ✅ 動態主內容
  const renderMainContent = () => {
    if (activePage === "shift") return <BusinessShiftSelector businessId={business.business_id} />;
    if (activePage === "customers") return <BusinessCustomerList businessId={business.business_id} />;
    if (activePage === "agents") return <BusinessAgentList businessId={business.business_id} />;
    if (activePage === "performance") return <BusinessPerformance businessId={business.business_id} />;

    // === 預設 Dashboard ===
    return (
      <>
        {/* 👤 個人資訊 */}
        <section className={styles.profileCard}>
          <h2 className={styles.sectionTitle}>個人資訊</h2>
          <div className={styles.profileInfo}>
            <div>
              <p><strong>姓名：</strong>{business.name}</p>
              <p><strong>推薦碼：</strong>{business.referral_code || "N/A"}</p>
            </div>
            <div>
              <p>
                <strong>推薦網址：</strong>
                <a href={business.referral_url} target="_blank" rel="noreferrer">
                  {business.referral_url}
                </a>
              </p>
              <p><strong>推薦人數：</strong>{stats.referralCount}</p>
            </div>
          </div>
        </section>

        {/* 💰 績效統計 */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>本月佣金</h3>
            <p className={styles.statValue}>${stats.monthlyCommission.toLocaleString()}</p>
          </div>
          <div className={styles.statCard}>
            <h3>總佣金</h3>
            <p className={styles.statValue}>${stats.totalCommission.toLocaleString()}</p>
          </div>
          <div className={styles.statCard}>
            <h3>成交案件</h3>
            <p className={styles.statValue}>{stats.loanCount}</p>
          </div>
          <div className={styles.statCard}>
            <h3>推薦總數</h3>
            <p className={styles.statValue}>{stats.referralCount}</p>
          </div>
        </section>

        {/* 📈 圖表區 */}
        <section className={styles.chartSection}>
          <div className={styles.chartBox}>
            <h3>月度佣金趨勢</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={[
                  { month: "6月", commission: 2000 },
                  { month: "7月", commission: 3500 },
                  { month: "8月", commission: 4800 },
                  { month: "9月", commission: 4200 },
                  { month: "10月", commission: stats.monthlyCommission },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line type="monotone" dataKey="commission" stroke="#00C49F" strokeWidth={3} dot={{ fill: "#00C49F", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartBox}>
            <h3>客戶類型比例</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "個人貸款", value: 65 },
                    { name: "企業貸款", value: 25 },
                    { name: "其他", value: 10 },
                  ]}
                  dataKey="value"
                  outerRadius={80}
                  label
                >
                  {COLORS.map((color, index) => (
                    <Cell key={index} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 🧾 客戶清單 */}
        <section className={styles.tableSection}>
          <h3>推薦客戶清單</h3>
          {clients.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>電話</th>
                  <th>申請筆數</th>
                  <th>最後更新</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.loan_count}</td>
                    <td>{c.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>目前沒有推薦的客戶。</p>
          )}
        </section>

        {/* 🔔 公告區 */}
        <section className={styles.announcement}>
          <h3>系統公告</h3>
          <ul>
            {announcements.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <span>（{a.date}）</span>
                <p>{a.content}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ⚙️ 快捷操作 */}
        <div className={styles.actions}>
          <button className={styles.exportBtn} onClick={handleExport}>匯出報表</button>
          <button className={styles.manageBtn} onClick={handleManageDownline}>管理下線</button>
        </div>

        {/* ✏️ 編輯個人資料 Modal */}
        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>編輯個人資料</h2>
              <div className={styles.modalGrid}>
                <div><label>姓名</label><input name="name" value={editData.name} onChange={handleChange} /></div>
                <div><label>電話</label><input name="phone" value={editData.phone} onChange={handleChange} /></div>
                <div><label>電子郵件</label><input name="email" value={editData.email} onChange={handleChange} /></div>
                <div><label>LINE ID</label><input name="line_id" value={editData.line_id} onChange={handleChange} /></div>
                <div><label>新密碼（可留空）</label><input type="password" name="new_password" value={editData.new_password || ""} onChange={handleChange} placeholder="不變更可留空" /></div>
              </div>
              <div className={styles.modalActions}>
                <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>取消</button>
                <button onClick={handleSaveProfile} className={styles.saveBtn}>儲存變更</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // === 畫面回傳 ===
  if (isMobile)
    return (
      <div className={styles.mobileBlock}>
        <h2>⚠️ 無法使用手機訪問業務後台</h2>
        <p>請使用電腦或平板裝置以獲得完整功能。</p>
      </div>
    );

  if (loading) return <p className={styles.loading}>載入中...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!business) return <p className={styles.error}>找不到業務資料</p>;

  return (
    <div className={styles.dashboardContainer}>
      {/* ===== 左側導覽欄 ===== */}
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>業務中心</h2>
        <nav>
          <ul>
            <li className={activePage === "dashboard" ? styles.active : ""} onClick={() => setActivePage("dashboard")}>🏠 儀表板</li>
            <li className={activePage === "shift" ? styles.active : ""} onClick={() => setActivePage("shift")}>🕒 上班時段</li>
            <li className={activePage === "customers" ? styles.active : ""} onClick={() => setActivePage("customers")}>👥 客戶列表</li>
            <li className={activePage === "agents" ? styles.active : ""} onClick={() => setActivePage("agents")}>🤝 代理商列表</li>
            <li className={activePage === "performance" ? styles.active : ""} onClick={() => setActivePage("performance")}>🤝 業績查詢</li>
          </ul>
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>登出</button>
      </aside>

      {/* ===== 右側主內容 ===== */}
      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <h1>歡迎回來，{business.name}</h1>
          <button className={styles.editBtn} onClick={handleEditProfile}>✏️ 編輯個人資料</button>
        </div>

        {/* ✅ 動態切換主內容 */}
        {renderMainContent()}
      </main>
    </div>
  );
}
