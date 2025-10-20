import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Admin_Dashboard.module.css";
import Admin_Contact from "../pages/Contact"; // ✅ 聯絡紀錄
import LoanApplication from "../pages/Loan"; // ✅ 核貸紀錄

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("dashboard"); // 控制右側主內容

  // ✅ 初始化登入狀態與載入資料
  useEffect(() => {
    const localUser = sessionStorage.getItem("user");
    if (!localUser) {
      setError("未登入，返回登入頁...");
      setTimeout(() => navigate("/admin/login"), 1500);
      return;
    }

    const user = JSON.parse(localUser);
    setData({
      user,
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
      recent: [],
    });

    async function fetchData() {
      try {
        const res = await fetch(
          "http://localhost:8000/src/admin/api/get_admin_stats.php",
          { credentials: "include" }
        );

        let result;
        try {
          result = await res.json();
        } catch {
          const text = await res.text();
          console.error("❌ 後端回傳非 JSON：\n", text);
          setError("伺服器回傳錯誤格式，請檢查後端。");
          return;
        }

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || "伺服器回傳錯誤");
        }
      } catch (err) {
        console.error("❌ 無法連線到伺服器：", err);
        setError("無法連線到伺服器");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [navigate]);

  // ✅ 登出
  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/src/admin/api/logout.php", {
        credentials: "include",
      });
    } catch {
      console.warn("Logout error");
    }
    sessionStorage.removeItem("user");
    navigate("/admin/login");
  };

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

  // ✅ 根據 activePage 決定渲染內容
  const renderContent = () => {
    if (activePage === "contact") return <Admin_Contact />;
    if (activePage === "loan") return <LoanApplication />; // ✅ 新增核貸紀錄頁面
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
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", color: "#aaa" }}
                  >
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
                    <td>{item.loan_status}</td> {/* ✅ 改為 loan_status */}
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
  };

  // ✅ 側邊導覽選單
  const menuItems = [
    { key: "dashboard", name: "📊 儀表板" },
    { key: "contact", name: "📞 聯絡紀錄" },
    { key: "loan", name: "💰 核貸紀錄" },
    { key: "overview", name: "🔍 總覽查詢" },
  ];

  return (
    <div className={styles.adminContainer}>
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

        <div className={styles.sdiebarACT}>
          <span>您的權限為：{user.name}</span>
          {user.role === "Admin" && (
            <button
              onClick={() => navigate("/admin/system")}
              className={styles.adminBtn}
            >
              管理賬號
            </button>
          )}
        </div>
          {/* ✅ 手機版漢堡選單 */}
          <button
            className={`${styles.mobileMenuBtn} ${menuOpen ? styles.activeMenu : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
           {/* ✅ 手機版展開時顯示選單 */}
          <ul
            className={`${styles.menuList} ${menuOpen ? styles.showMenu : ""}`}
            onClick={() => setMenuOpen(false)} // 點選後自動收合
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
        {/* ✅ 手機底部導覽列 */}
        <div className={styles.mobileFooter}>
          <button
            className={activePage === "dashboard" ? styles.activeIcon : ""}
            onClick={() => setActivePage("dashboard")}
          >
            📊
          </button>
          <button
            className={activePage === "contact" ? styles.activeIcon : ""}
            onClick={() => setActivePage("contact")}
          >
            📞
          </button>
          <button
            className={activePage === "loan" ? styles.activeIcon : ""}
            onClick={() => setActivePage("loan")}
          >
            💰
          </button>
          <button onClick={handleLogout}>🚪</button>
        </div>
      </aside>

      {/* === 右側主內容 === */}
      <main className={styles.mainContent}>{renderContent()}</main>
    </div>
  );
}
