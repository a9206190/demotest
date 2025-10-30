import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@config/apiConfig"; //集成API
import styles from "./Admin_Dashboard.module.css";
import Admin_Contact from "../pages/Contact";
import LoanApplication from "../pages/Loan"; 
import Overview from "../pages/Overview";
import ApprovedList from "../pages/ApprovedList";
import AgentList from "../pages/AgentList";
import BusinessList from "../pages/BusinessList";


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("dashboard");

  // ✅ 初始化登入狀態（從 Session 檢查）
  useEffect(() => {
    let intervalId;

    // 定義取得 Dashboard 資料的函式
    const fetchDashboardData = async () => {
      try {
        const res = await fetch(API.GET_ADMIN_STATUS, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) {
          setData(json);
          setError("");
        } else {
          throw new Error(json.error || "資料載入失敗");
        }
      } catch (err) {
        console.error("❌ Dashboard 更新失敗：", err);
        setError(err.message);
      }
    };

    // 初次登入檢查
    fetch(API.CHECK_SESSION, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          navigate("/admin/login");
          return;
        }


        // ✅ 首次載入儀表板資料
        fetchDashboardData();

        // ✅ 每 5 秒自動更新一次
        intervalId = setInterval(fetchDashboardData, 5000);
      })
      .catch(() => {
        navigate("/admin/login");
      })
      .finally(() => setLoading(false));

    // ✅ 清除 Interval 避免重複輪詢
    return () => clearInterval(intervalId);
  }, [navigate]);


  // ✅ 登出
  const handleLogout = async () => {
    try {
      await fetch(API.LOGOUT, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      console.warn("Logout error");
    }
    sessionStorage.removeItem("user");
    navigate("/admin/login");
  };
  // 💡 [新增] 未登入顯示提示畫面
  if (error && error.includes("未登入")) {
    return <div className={styles.loading}>未登入中，正在跳轉登入頁...</div>;
  }

  // 💡 [新增] 載入中提示
  if (loading) return <div className={styles.loading}>載入中...</div>;

  // ✅ 系統重新載入
  const handleReload = () => window.location.reload();

  // === 載入 / 錯誤顯示 ===
  if (loading) return <div className={styles.loading}>載入中...</div>;
  if (error)
    return (
      <div className={styles.error}>
        ❌ {error}
        <br />
        <small>若問題持續，請重新整理或重新登入。</small>
      </div>
    );
  if (!data || !data.user)
    return <div className={styles.error}>⚠️ 無登入資料，請重新登入。</div>;

  const { user, stats, recent } = data;

  // ✅ 根據 activePage 決定右側顯示內容
  const renderContent = () => {
    switch (activePage) {
      case "contact":
        return <Admin_Contact />;
      case "loan":
        return <LoanApplication />;
      case "overview":
        return <Overview />;
      case "approved":
      // ✅ 桌機可見，手機隱藏
      if (window.innerWidth < 768) {
        return (
          <div
            style={{
              textAlign: "center",
              padding: "4rem",
              color: "#888",
              fontSize: "1.1rem",
            }}
          >
            📱 此頁面僅支援桌機版顯示
          </div>
        );
      }
        return <ApprovedList />;
      case "business":
        if (window.innerWidth < 768)
          return <p style={{ textAlign: "center", padding: "4rem" }}>📱 此頁面僅支援桌機版顯示</p>;
        return <BusinessList />;
      case "agent":
        if (window.innerWidth < 768)
          return <p style={{ textAlign: "center", padding: "4rem" }}>📱 此頁面僅支援桌機版顯示</p>;
        return <AgentList />;
      default:
        return (
          <>
            <header className={styles.header}>
              <h1>歡迎, {user.name}!</h1>
            </header>

            <section className={styles.dashboardContent}>
              <h2>📈 儀表板總覽</h2>

              <div className={styles.cards}>
                <div className={styles.card}>
                  <h3>總申請數</h3>
                  <p>{stats.total}</p>
                </div>
                <div className={styles.card}>
                  <h3>待審核</h3>
                  <p>{stats.pending}</p>
                </div>
                <div className={styles.card}>
                  <h3>已核准</h3>
                  <p>{stats.approved}</p>
                </div>
                <div className={styles.card}>
                  <h3>已退件</h3>
                  <p>{stats.rejected}</p>
                </div>
              </div>

              <h2>📋 最近 5 筆申請</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>姓名</th>
                    <th>單期金額</th>
                    <th>狀態</th>
                    <th>建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {!recent || recent.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", color: "#aaa" }}>
                        暫無資料
                      </td>
                    </tr>
                  ) : (
                    recent.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.name}</td>
                        <td>
                          {item.loan_amount
                            ? `${Number(item.loan_amount).toLocaleString()} 元`
                            : "-"}
                        </td>
                        <td>{item.loan_status}</td>
                        <td>
                          {new Date(item.created_at).toLocaleString("zh-TW", {
                            hour12: false,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </>
        );
    }
  };

  // ✅ 側邊導覽選單
  const menuItems = [
    { key: "dashboard", name: "📊 儀表板" },
    { key: "contact", name: "📞 聯絡紀錄" },
    { key: "loan", name: "💰 申請紀錄" },
    { key: "overview", name: "📜 資料管理" },
    { key: "approved", name: "✅ 已核貸列表" },
    { key: "business", name: "🏢 業務列表" },
    { key: "agent", name: "👥 代理商列表" },
  ];

  return (
    <div className={styles.adminContainer}>
      {/* === 手機頂部導覽列 === */}
      <div className={styles.mobileTopBar}>
        <button
          className={`${styles.mobileMenuBtn} ${menuOpen ? styles.activeMenu : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h2 className={styles.mobileTitle}>管理員面板</h2>
      </div>
        {/* === 手機展開導覽選單 === */}
        <ul className={`${styles.mobileMenu} ${menuOpen ? styles.showMenu : ""}`}>
          <li
            onClick={() => {
              setActivePage("dashboard");
              setMenuOpen(false);
            }}
          >
            📊 儀表板
          </li>
          <li
            onClick={() => {
              setActivePage("contact");
              setMenuOpen(false);
            }}
          >
            📞 聯絡紀錄
          </li>
          <li
            onClick={() => {
              setActivePage("loan");
              setMenuOpen(false);
            }}
          >
            💰 核貸紀錄
          </li>
          <li
            onClick={() => {
              setActivePage("overview");
              setMenuOpen(false);
            }}
          >
            📜 資料管理
          </li>
          <li
            onClick={() => {
              navigate("/admin/system");
              setMenuOpen(false);
            }}
          >
            ⚙️ 管理賬號
          </li>
          <li><button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 登出
          </button></li>
        </ul>

      {/* === 左側導覽列 === */}
      <aside className={styles.sidebar}>
        <button
          className={`${styles.mobileMenuBtn} ${menuOpen ? styles.activeMenu : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <h2 className={styles.sidebarTitle}>管理員面板</h2>

        <div className={styles.sidebarACT}>
          <span>登入身份：{user.name}</span>
          {user.role === "Admin" && (
            <button
              onClick={() => navigate("/admin/system")}
              className={styles.adminBtn}
            >
              管理賬號
            </button>
          )}
        </div>

        <ul
          className={`${styles.menuList} ${menuOpen ? styles.showMenu : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          {menuItems.map((item) => (
            <li
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={activePage === item.key ? styles.active : undefined}
            >
              {item.name}
            </li>
          ))}
        </ul>

        <div className={styles.sidebarBottom}>
          <button onClick={handleReload} className={styles.reloadBtn}>
            🔄 系統重新載入
          </button>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 登出
          </button>
        </div>
      </aside>

      {/* === 右側主內容 === */}
      <main className={styles.mainContent}>{renderContent()}</main>
    </div>
  );
}
