import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Admin_System.module.css";

export default function Admin_System() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const navigate = useNavigate();

// 強制根據 protocol 及 host 判斷，
const isLocal = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1");
const pathPrefix = window.location.pathname.includes("/demo") ? "/demo" : "";
const API_BASE = isLocal
  ? "http://localhost:8000"
  : `${window.location.origin}${pathPrefix}`;


  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  //  初始化：檢查登入 + 載入資料
  useEffect(() => {
    if (!user || !user.username) {
      alert("⚠️ 尚未登入，返回登入頁...");
      navigate("/admin/login");
      return;
    }
    fetchAccounts();
  }, []);

  // 防呆 強制登入
    useEffect(() => {
    if (!user || !user.username) {
      alert("⚠️ 尚未登入，返回登入頁...");
      navigate("/admin/login");
      return;
    }

    // 🚫 權限不足（只允許 Admin 與 SAdmin）
    if (!["Admin", "SAdmin"].includes(user.role)) {
      alert("🚫 您沒有權限訪問此頁面");
      navigate("/admin/dashboard");
      return;
    }

    fetchAccounts();
  }, []);

  //  取得帳號列表
  const fetchAccounts = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/get_admin_list.php?search=${encodeURIComponent(keyword)}`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      } else {
        alert("❌ 無法載入：" + (data.error || "伺服器回傳錯誤"));
      }
    } catch (err) {
      console.error("載入帳號錯誤:", err);
      alert("⚠️ 無法連線到伺服器，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const roleMap = {
    Admin: "最高管理員",
    SAdmin: "行政管理員",
    BAdmin: "業務",
    GAdmin: "代理商",
  };
  // === 新增帳號 ===
  const handleCreate = async () => {
    // 檢查基本欄位（帳號與姓名必填）
    if (!modalData.username || !modalData.full_name) {
      alert("⚠️ 請填寫帳號與姓名");
      return;
    }

    // 若是 BAdmin 或 GAdmin，就忽略密碼欄位（由後端自動給 123456）
    const isAgentRole =
      modalData.role === "BAdmin" || modalData.role === "GAdmin";

    if (!isAgentRole && !modalData.password) {
      alert("⚠️ 請輸入密碼");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/create_account.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...modalData,
          password: isAgentRole ? "" : modalData.password, // 忽略密碼（交給後端預設）
        }),
      });

      const result = await res.json();
      if (result.success) {
        let msg = "✅ 帳號建立成功";
        if (result.default_password) {
          msg += `\n初始密碼：${result.default_password}`;
        }
        alert(msg);
        closeModal();
        fetchAccounts();
      } else {
        alert("❌ 建立失敗：" + result.error);
      }
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  //  修改帳號
  const handleUpdate = async () => {
    if (!modalData.username || !modalData.full_name) {
      alert("⚠️ 請輸入帳號與暱稱");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/update_account.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(modalData),
      });

      const result = await res.json();
      if (result.success) {
        alert("✅ 更新成功");
        closeModal();
        fetchAccounts();
      } else {
        alert("❌ 更新失敗：" + result.error);
      }
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  //  刪除帳號
  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除此帳號嗎？")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/delete_account.php?id=${id}`,
        { method: "DELETE", credentials: "include" }
      );
      const result = await res.json();
      if (result.success) {
        alert("🗑️ 帳號已刪除");
        fetchAccounts();
      } else {
        alert("❌ 刪除失敗：" + result.error);
      }
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  const openCreateModal = () => {
    setModalType("create");
    setModalData({
      username: "",
      password: "",
      full_name: "",
      role: "SAdmin",
    });
  };

  const openEditModal = (acc) => {
    setModalType("edit");
    setModalData({
      id: acc.id,
      username: acc.username,
      full_name: acc.full_name,
      role: acc.role,
      new_password: "",
    });
  };

  const closeModal = () => {
    setModalType(null);
    setModalData(null);
  };

  // === 新增：複製推薦連結函式 ===
  const copyReferralLink = async (acc) => {
    try {
      // 根據角色選擇來源資料表
      const table =
        acc.role === "BAdmin"
          ? "business_list"
          : acc.role === "GAdmin"
          ? "agent_list"
          : null;

      if (!table) {
        alert("⚠️ 僅業務或代理商可複製推薦連結");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/admin/get_referral_url.php?table=${table}&referral_code=${acc.referral_code}`,
        { credentials: "include" }
      );
      const data = await res.json();

      if (data.success && data.referral_url) {
        await navigator.clipboard.writeText(data.referral_url);
        alert("✅ 已複製推薦連結！\n" + data.referral_url);
      } else {
        alert("❌ 找不到推薦連結");
      }
    } catch (err) {
      console.error(err);
      alert("❌ 複製失敗：" + err.message);
    }
  };
  return (
    <div className={styles.mainContent}>
      {/* === 頂部 === */}
      <div className={styles.headerRow}>
        <h2>⚙️ 帳號管理中心</h2>
        <div className={styles.headerBtns}>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/admin/dashboard")}
          >
            ← 返回 Dashboard
          </button>
          <button className={styles.addBtn} onClick={openCreateModal}>
            ➕ 新增帳號
          </button>
        </div>
      </div>

      <p>歡迎 {user.name || "管理員"}（{user.role}）</p>

      {/* === 搜尋 === */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="搜尋帳號或姓名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => fetchAccounts(search)}>🔍 查詢</button>
      </div>

      {/* === 帳號列表 === */}
      {loading ? (
        <p>載入中...</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>帳號</th>
              <th>暱稱</th>
              <th>權限</th>
              <th>推薦碼</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  暫無資料
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr className={styles.trtextcolor} key={acc.id}>
                  <td>{acc.username}</td>
                  <td>{acc.full_name}</td>
                  <td>{roleMap[acc.role] || acc.role}</td>
                  <td>
                    {acc.referral_code ? (
                      <span
                        className={styles.referralCode}
                        onClick={() => copyReferralLink(acc)}
                        title="點擊複製推薦連結"
                        style={{ cursor: "pointer", color: "#007bff" }}
                      >
                        {acc.referral_code} 📋
                      </span>
                    ) : (
                      <span style={{ color: "#999" }}>—</span>
                    )}
                  </td>
                  <td>{acc.status}</td>
                  <td>
                    {!acc.locked ? (
                      <>
                        <button onClick={() => openEditModal(acc)}>✏️ 編輯</button>
                        <button onClick={() => handleDelete(acc.id)}>🗑️ 刪除</button>
                      </>
                    ) : (
                      <span style={{ color: "#aaa" }}>🔒 無法修改</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* === Modal === */}
      {modalType && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{modalType === "create" ? "➕ 新增帳號" : "✏️ 編輯帳號"}</h3>
            <input
              type="text"
              placeholder="帳號"
              value={modalData.username}
              onChange={(e) =>
                setModalData({ ...modalData, username: e.target.value })
              }
            />
            {modalType === "create" ? (
              <input
                type="password"
                placeholder="密碼"
                value={modalData.password}
                onChange={(e) =>
                  setModalData({ ...modalData, password: e.target.value })
                }
              />
            ) : (
              <input
                type="password"
                placeholder="新密碼（可留空）"
                value={modalData.new_password || ""}
                onChange={(e) =>
                  setModalData({ ...modalData, new_password: e.target.value })
                }
              />
            )}
            <input
              type="text"
              placeholder="姓名 / 暱稱"
              value={modalData.full_name}
              onChange={(e) =>
                setModalData({ ...modalData, full_name: e.target.value })
              }
            />
            <select
              value={modalData.role}
              onChange={(e) => setModalData({ ...modalData, role: e.target.value })}
            >
              {Object.entries(roleMap).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className={styles.modalBtns}>
              <button
                className={styles.saveBtn}
                onClick={modalType === "create" ? handleCreate : handleUpdate}
              >
                {modalType === "create" ? "✅ 建立" : "💾 儲存"}
              </button>
              <button className={styles.cancelBtn} onClick={closeModal}>
                ❌ 取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
