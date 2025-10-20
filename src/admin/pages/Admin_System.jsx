import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 新增導航功能
import styles from "../dashboard/Admin_Dashboard.module.css";

export default function Admin_System() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const navigate = useNavigate(); // ✅ React Router 導航用

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (keyword = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/src/admin/api/get_admin_list.php?search=${encodeURIComponent(
          keyword
        )}`
      );
      const data = await res.json();
      if (data.success) setAccounts(data.data);
    } catch (err) {
      console.error("載入帳號錯誤:", err);
    } finally {
      setLoading(false);
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

  const handleCreate = async () => {
    if (!modalData.username || !modalData.password || !modalData.full_name) {
      alert("⚠️ 請填寫所有欄位");
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:8000/src/admin/api/create_account.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalData),
        }
      );
      const result = await res.json();
      if (result.success) {
        alert("✅ 帳號建立成功");
        closeModal();
        fetchAccounts();
      } else alert("❌ 建立失敗：" + result.error);
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  const handleUpdate = async () => {
    if (!modalData.username || !modalData.full_name) {
      alert("⚠️ 請輸入帳號與暱稱");
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:8000/src/admin/api/update_account.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalData),
        }
      );
      const result = await res.json();
      if (result.success) {
        alert("✅ 更新成功");
        closeModal();
        fetchAccounts();
      } else {
        alert("❌ 失敗：" + result.error);
      }
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除此帳號嗎？")) return;
    try {
      const res = await fetch(
        `http://localhost:8000/src/admin/api/delete_account.php?id=${id}`,
        { method: "DELETE" }
      );
      const result = await res.json();
      if (result.success) {
        alert("🗑️ 帳號已刪除");
        fetchAccounts();
      } else alert("❌ 刪除失敗：" + result.error);
    } catch (err) {
      alert("系統錯誤：" + err.message);
    }
  };

  return (
    <div className={styles.mainContent}>
      {/* === 頂部標題與按鈕列 === */}
      <div className={styles.headerRow}>
        <h2>⚙️ 帳號管理中心</h2>
        <div className={styles.headerBtns}>
          <button className={styles.backBtn} onClick={() => navigate("/admin/dashboard")}>
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
              <th>姓名</th>
              <th>角色</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>
                  暫無資料
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.username}</td>
                  <td>{acc.full_name}</td>
                  <td>{acc.role}</td>
                  <td>{acc.status}</td>
                  <td>
                    <button onClick={() => openEditModal(acc)}>✏️ 編輯</button>
                    <button onClick={() => handleDelete(acc.id)}>🗑️ 刪除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* === 共用 Modal === */}
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
              onChange={(e) =>
                setModalData({ ...modalData, role: e.target.value })
              }
            >
              <option value="Admin">Admin</option>
              <option value="SAdmin">SAdmin</option>
              <option value="BAdmin">BAdmin</option>
              <option value="GAdmin">GAdmin</option>
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
