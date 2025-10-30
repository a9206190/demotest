import React, { useEffect, useState } from "react";
import styles from "./Agent_Dashboard.module.css";
import API from "@config/apiConfig";
import Agent_Customers from "../agent/AgentCustomersList";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AgentDashboard() {
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState({});
  // const [clients, setClients] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activePage, setActivePage] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    phone: "",
    email: "",
    line_id: "",
    new_password: "",
  });
  const [isMobile, setIsMobile] = useState(false);

  // 📱 偵測裝置尺寸
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 📦 載入代理商資料
  useEffect(() => {
    fetch(API.GET_AGENT_LIST, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          const myData = data.data[0];
          setAgent(myData);
          setEditData({
            agent_id: myData.agent_id || "",
            name: myData.name || "",
            phone: myData.phone || "",
            email: myData.email || "",
            line_id: myData.line_id || "",
            new_password: "",
          });
          // setClients(myData.clients || []);
          setStats({
            todayApplications: myData.today_applications || 0,
            monthlyDeals: myData.monthly_deals || 0,
            totalCommission: myData.total_commission || 0,
            customerCount: myData.customer_count || 0,
            referralCount: myData.referral_count || 0,
          });
        } else {
          setError(data.error || "無法取得代理商資料");
        }
      })
      .catch((err) => setError("伺服器錯誤：" + err))
      .finally(() => setLoading(false));
  }, []);

  // 🔔 模擬公告
  useEffect(() => {
    setAnnouncements([
      { id: 1, title: "系統維護公告", date: "2025-10-26", content: "系統將於今晚 11:00 進行例行維護。" },
      { id: 2, title: "獎勵更新", date: "2025-10-20", content: "推薦獎金制度已更新，請參閱最新公告。" },
    ]);
  }, []);

  // ✏️ Modal 控制
  const handleEditProfile = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      const filteredData = Object.fromEntries(Object.entries(editData).filter(([, v]) => v !== ""));
      const payload = { ...filteredData, agent_id: agent?.agent_id || editData.agent_id || "" };

      const res = await fetch(API.UPDATE_AGENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ 個人資料更新成功！");
        setAgent((prev) => ({ ...prev, ...data.data }));
        setShowModal(false);
      } else {
        alert("❌ 更新失敗：" + (data.error || "未知錯誤"));
      }
    } catch (err) {
      console.error("❌ 更新錯誤：", err);
      alert("伺服器錯誤：" + err.message);
    }
  };

  const handleExport = () => window.open(API.EXPORT_EXCEL, "_blank");

  const handleLogout = async () => {
    try {
      const res = await fetch(API.LOGOUT, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        sessionStorage.removeItem("user");
        const currentPath = window.location.pathname;
        const inDemo = currentPath.startsWith("/demo");
        const redirectURL = `${window.location.origin}${inDemo ? "/demo" : ""}/admin/login`;
        window.location.href = redirectURL;
      }
    } catch (err) {
      console.error("❌ 登出錯誤：", err);
      alert("伺服器錯誤，請稍後再試");
    }
  };

  // 📵 手機禁止訪問
  if (isMobile) {
    return (
      <div className={styles.mobileBlock}>
        <h2>📱 無法於手機上開啟</h2>
        <p>請使用電腦或平板登入代理商後台。</p>
      </div>
    );
  }

  if (loading) return <p className={styles.loading}>載入中...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!agent) return <p className={styles.error}>找不到代理商資料</p>;

  // === 🧩 主內容切換函式 ===
  const renderMainContent = () => {
    if (activePage === "customers") {
      return <Agent_Customers />;
    }

    // === 預設儀表板 ===
    return (
      <>
        {/* 👤 個人資料 */}
        <section className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <h2 className={styles.sectionTitle}>個人資料</h2>
            <button className={styles.editBtn} onClick={handleEditProfile}>✏️ 編輯個人資料</button>
          </div>

          <div className={styles.profileInfo}>
            <div>
              <p><strong>姓名：</strong>{agent.name}</p>
              <p><strong>推薦碼：</strong>{agent.referral_code}</p>
            </div>
            <div>
              <p><strong>推薦網址：</strong>
                <a href={agent.referral_url} target="_blank" rel="noreferrer">{agent.referral_url}</a>
              </p>
              <p><strong>客戶數量：</strong>{stats.customerCount}</p>
            </div>
          </div>
        </section>

        {/* 💰 業績統計 */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h3>今日申請數</h3>
            <p className={styles.statValue}>{stats.todayApplications}</p>
          </div>
          <div className={styles.statCard}>
            <h3>本月成交數</h3>
            <p className={styles.statValue}>{stats.monthlyDeals}</p>
          </div>
          <div className={styles.statCard}>
            <h3>累積佣金</h3>
            <p className={styles.statValue}>${stats.totalCommission.toLocaleString()}</p>
          </div>
        </section>

        {/* 📈 趨勢圖 */}
        <section className={styles.chartSection}>
          <h3 className={styles.chartTitle}>本月申請趨勢</h3>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={[
                  { day: "1", value: 5 },
                  { day: "5", value: 9 },
                  { day: "10", value: 13 },
                  { day: "15", value: 8 },
                  { day: "20", value: 11 },
                  { day: "25", value: 7 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={3} dot={{ fill: "#00C49F", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 🔔 公告 */}
        <section className={styles.announcement}>
          <h3>公告與通知</h3>
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

        {/* ⚙️ 匯出 */}
        <div className={styles.actions}>
          <button className={styles.exportBtn} onClick={handleExport}>匯出報表</button>
        </div>
      </>
    );
  };

  // === 畫面 ===
  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <h2 className={styles.logo}>代理商後台</h2>
        <ul>
          <li
            className={activePage === "dashboard" ? styles.active : ""}
            onClick={() => setActivePage("dashboard")}
          >
            🏠 儀表板
          </li>
          <li
            className={activePage === "customers" ? styles.active : ""}
            onClick={() => setActivePage("customers")}
          >
            👥 客戶列表
          </li>
        </ul>
        <button className={styles.logoutBtn} onClick={handleLogout}>登出</button>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <h1>歡迎回來，{agent.name}</h1>
        </div>

        {/* ✅ 根據 activePage 切換主畫面 */}
        {renderMainContent()}

        {/* ✏️ 編輯 Modal */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>編輯個人資料</h2>
              <div className={styles.modalGrid}>
                <label>姓名</label>
                <input name="name" value={editData.name} onChange={handleChange} />
                <label>電話</label>
                <input name="phone" value={editData.phone} onChange={handleChange} />
                <label>電子郵件</label>
                <input name="email" value={editData.email} onChange={handleChange} />
                <label>LINE ID</label>
                <input name="line_id" value={editData.line_id} onChange={handleChange} />
                <label>新密碼（可留空）</label>
                <input type="password" name="new_password" value={editData.new_password || ""} onChange={handleChange} placeholder="若不變更密碼可留空" />
              </div>
              <div className={styles.modalActions}>
                <button onClick={handleCloseModal} className={styles.cancelBtn}>取消</button>
                <button onClick={handleSaveProfile} className={styles.saveBtn}>儲存變更</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
