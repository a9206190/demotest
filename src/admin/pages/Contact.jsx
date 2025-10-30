import React, { useEffect, useState } from "react";
import styles from "./Contact.module.css";

export default function Admin_Contact() {
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  //  自動判斷環境（與 Admin_System.jsx 相同邏輯）
  const isLocal =
    window.location.origin.includes("localhost") ||
    window.location.origin.includes("127.0.0.1");
  const pathPrefix = window.location.pathname.includes("/demo") ? "/demo" : "";
  const API_BASE = isLocal
    ? "http://localhost:8000"
    : `${window.location.origin}${pathPrefix}`;

  //  取得聯絡紀錄資料
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/get_contact.php`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setContacts(result.data);
        setFiltered(result.data);
      } else {
        setError(result.error || "讀取失敗");
      }
    } catch (err) {
      console.error("❌ 無法連線伺服器：", err);
      setError("無法連線伺服器");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  //  搜尋過濾
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts);
    } else {
      const keyword = search.toLowerCase();
      setCurrentPage(1); // 每次搜尋重置回第 1 頁
      setFiltered(
        contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(keyword) ||
            c.phone.includes(keyword)
        )
      );
    }
  }, [search, contacts]);
  // === 分頁處理 ===
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentData = filtered.slice(startIdx, endIdx);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  //  編輯 / 檢視 / 刪除 / 儲存
  const handleEdit = (c) => {
    setSelected({ ...c });
    setEditMode(true);
  };

  const handleView = (c) => {
    setSelected({ ...c });
    setEditMode(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("確定要刪除此紀錄嗎？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/delete_contact.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const result = await res.json();
      if (result.success) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        setToast("✅ 已刪除紀錄");
        setTimeout(() => setToast(null), 2000);
      } else alert("刪除失敗：" + result.error);
    } catch (err) {
      alert("❌ 發生錯誤：" + err.message);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/update_contact.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(selected),
      });
      const result = await res.json();
      if (result.success) {
        setToast("✅ 更新成功");
        setTimeout(() => setToast(null), 2000);
        setSelected(null);
        fetchContacts(); // ← 更新後重新載入資料
      } else {
        alert("更新失敗：" + result.error);
      }
    } catch (err) {
      alert("❌ 發生錯誤：" + err.message);
    }
  };

  //  載入 / 錯誤顯示
  if (loading) return <p className={styles.loading}>🧭 載入中...</p>;
  if (error)
    return (
      <div className={styles.error}>
        ❌ {error}
        <br />
        <small>請稍後再試</small>
      </div>
    );

  return (
    <div className={styles.mainContent}>
      <h2>📞 聯絡紀錄</h2>
      <p>
        歡迎 {user.name || "使用者"}（{user.role || "角色"}）
      </p>
      <hr />

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* 🔍 搜尋框 */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 搜尋姓名或電話..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <table className={styles.contactTable}>
        <thead>
          <tr>
            <th>ID</th>
            <th>姓名</th>
            <th>電話</th>
            <th>狀態</th>
            <th>聯繫內容</th>
            <th>建立時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#aaa" }}>
                沒有符合條件的資料
              </td>
            </tr>
          ) : (
            currentData.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td
                  style={{
                    color: c.status === "已聯繫" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {c.status}
                </td>
                <td>{c.contact_note || "—"}</td>
                <td>{new Date(c.created_at).toLocaleString("zh-TW")}</td>
                <td>
                  <button
                    className={`${styles.contactBtn} ${styles.viewBtn}`}
                    onClick={() => handleView(c)}
                  >
                    檢視
                  </button>
                  <button
                    className={`${styles.contactBtn} ${styles.editBtn}`}
                    onClick={() => handleEdit(c)}
                  >
                    ✏️ 編輯
                  </button>
                  <button
                    className={`${styles.contactBtn} ${styles.deleteBtn}`}
                    onClick={() => handleDelete(c.id)}
                  >
                    🗑️ 刪除
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 📄 分頁控制 */}
      {filtered.length > 0 && (
        <div className={styles.pagination}>
          <button onClick={handlePrevPage} disabled={currentPage === 1}>
            ⬅️ 上一頁
          </button>
          <span>
            第 {currentPage} / {totalPages} 頁（共 {filtered.length} 筆）
          </span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages}>
            下一頁 ➡️
          </button>
        </div>
      )}


      {/*  檢視/編輯對話框 */}
      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>{editMode ? "✏️ 編輯聯絡紀錄" : "👁️ 檢視聯絡紀錄"}</h3>
            <p>
              <b>姓名：</b>
              {selected.name}
            </p>
            <p>
              <b>電話：</b>
              {selected.phone}
            </p>
            <p>
              <b>建立時間：</b>
              {new Date(selected.created_at).toLocaleString("zh-TW")}
            </p>

            <label>狀態：</label>
            <select
              disabled={!editMode}
              value={selected.status}
              onChange={(e) =>
                setSelected({ ...selected, status: e.target.value })
              }
            >
              <option value="未聯繫">未聯繫</option>
              <option value="已聯繫">已聯繫</option>
            </select>

            <label>聯繫內容：</label>
            <textarea
              disabled={!editMode}
              value={selected.contact_note || ""}
              onChange={(e) =>
                setSelected({ ...selected, contact_note: e.target.value })
              }
            />

            <div className={styles.modalActions}>
              {editMode && <button onClick={handleSave}>💾 儲存</button>}
              <button onClick={() => setSelected(null)}>❌ 關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
