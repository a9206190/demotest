import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
import styles from "./OverView.LoanManage.module.css";
// eslint-disable-next-line no-unused-vars
import API, { fetchAPI } from "@config/apiConfig";

export default function LoanManage() {
  // const navigate = useNavigate();

  const API_BASE =
    window.location.origin.replace(/\/$/, "");
    window.location.hostname === "localhost"
      ? "http://localhost:8000"
      : "https://moneyfast.cc/";

  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [followupFiles, setFollowupFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [uploading, setUploading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [toast, setToast] = useState(null);
  const [editPage, setEditPage] = useState(0); // 🆕 新增：控制多頁分支
  // === Toast 共用提示 ===
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000); // 2 秒自動消失
  };

  // 📦 讀取列表
  const fetchData = async (search = "") => {
  setLoading(true);
  try {
      const url = `${API.LOAN_MANAGE}?action=list${
      search ? `&keyword=${encodeURIComponent(search)}` : ""
    }`;
    const res = await fetch(url, { credentials: "include" });
    const result = await res.json();
    if (result.success) setData(result.data);
    else alert("載入失敗：" + (result.error || "未知錯誤"));
  } catch (err) {
    console.error("❌ Fetch 失敗:", err);
    alert("伺服器連線失敗");
  }
  setLoading(false);
};


  useEffect(() => {
    fetchData();
  }, []);

  // 📱 手機阻擋
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile)
    return (
      <div className={styles.mobileBlock}>
        <h2>📵 無法使用</h2>
        <p>本管理頁僅供電腦版使用。</p>
      </div>
    );

  // 🔍 搜尋
  const handleSearchInput = (value) => {
    setKeyword(value);
    const timeout = setTimeout(() => fetchData(value), 400);
    return () => clearTimeout(timeout);
  };

  // ✏️ 編輯用戶資料
  const openEditModal = async (row) => {
    setSelected(row);
    setEditPage(0); // 預設第 0 頁「基本資料」

    try {
      const res = await fetch(`${API_BASE}/api/admin/loan_manage.php?action=get&id=${row.id}`, {
        credentials: "include",
      });
      const result = await res.json();

      if (result.success && result.data) {
        setForm(result.data); // ✅ 把後端完整資料放入 form
        setShowEditModal(true);
      } else {
        alert("❌ 取得資料失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      alert("❌ 無法載入用戶資料：" + err.message);
    }
  };

  const saveEdit = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/loan_manage.php?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const result = await res.json();
      if (result.success) {
        alert("✅ 修改成功");
        setShowEditModal(false);
        fetchData(keyword);
      } else {
        alert("❌ 修改失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      alert("❌ 伺服器錯誤：" + err.message);
    }
  };

  // 📁 檔案 Modal
  const openFileModal = async (row) => {
    setSelected(row);
    setShowFileModal(true);
    setActiveTab("main");
    await fetchFiles(row.application_no);
    await fetchFollowupFiles(row.application_no);
  };

// === 主要檔案 ===
const fetchFiles = async (applicationId) => {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/get_loan_files.php?id=${applicationId}`, {
      credentials: "include",
    });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      setFiles(result.data);
    } else {
      console.error("❌ 無法載入主要檔案：", result.error);
    }
  } catch (err) {
    console.error("❌ 讀取主要檔案失敗:", err);
  }
};

// === 後續附件 ===
const fetchFollowupFiles = async (applicationId) => {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/get_followup_files.php?id=${applicationId}`, {
      credentials: "include",
    });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      setFollowupFiles(result.data);
    } else {
      console.error("❌ 無法載入後續附件：", result.error);
    }
  } catch (err) {
    console.error("❌ 讀取後續附件失敗:", err);
  }
};

// === 上傳後續附件 ===

const handleUploadFollowup = async (e) => {
  const file = e.target.files[0];
  if (!file || !selected) return;

  setUploading(true);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("application_id", selected.application_no);

  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/upload_followup_file.php`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const result = await res.json();
    if (result.success) {
      await fetchFollowupFiles(selected.application_no);
      showToast("✅ 上傳成功");
    } else {
      alert("❌ 上傳失敗：" + result.error);
    }
  } catch (err) {
    alert("❌ 上傳錯誤：" + err.message);
  }

  e.target.value = "";
  setUploading(false);
};

// === 刪除後續附件 ===
const handleDeleteFollowup = async (fileId) => {
  if (!window.confirm("確定要刪除此後續附件嗎？")) return;
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/delete_followup_file.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: fileId }),
    });
    const result = await res.json();
    if (result.success) {
      await fetchFollowupFiles(selected.application_no);
      showToast("🗑️ 已刪除後續附件");
    } else {
      alert("❌ 刪除失敗：" + result.error);
    }
  } catch (err) {
    alert("❌ 刪除錯誤：" + err.message);
  }
};

// === 編輯後續附件 Note ===
const handleEditNote = async (fileId, newNote) => {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/admin/update_followup_note.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: fileId, note: newNote }),
    });
    const result = await res.json();
    if (result.success) {
      setFollowupFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, note: newNote } : f))
      );
      showToast("✅ 備註已更新");
    } else {
      alert("❌ 更新備註失敗：" + result.error);
    }
  } catch (err) {
    alert("❌ 伺服器錯誤：" + err.message);
  }
};


  // === 檔案顯示 ===
  const renderFileList = (fileArray, isFollowup = false) => {
    if (!fileArray || fileArray.length === 0)
      return <p>目前沒有上傳的檔案</p>;

    return (
      <div className={styles.fileGrid}>
        {fileArray.map((f) => (
          <div key={f.id} className={styles.fileItem}>
            <a href={f.file_path} target="_blank" rel="noreferrer">
              <img
                src={f.file_path}
                alt={f.file_type || "file"}
                className={styles.preview}
                loading="lazy"
                onError={(e) =>
                  (e.target.src = `${API_BASE}/assets/no-image.png`)
                }
              />
            </a>
            {f.uploader && (
              <p style={{ fontSize: "0.8em", color: "#666" }}>
                上傳者：{f.uploader}
              </p>
            )}
            {isFollowup && (
              <>
                <textarea
                  placeholder="輸入備註..."
                  value={f.note || ""}
                  onChange={(e) =>
                    handleEditNote(f.id, e.target.value)
                  }
                  className={styles.noteInput}
                />
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDeleteFollowup(f.id)}
                >
                  🗑 刪除
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };
  
    // 🗑 刪除用戶
  const deleteRow = async (id) => {
    if (!window.confirm("確定要刪除此用戶與其所有檔案嗎？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/loan_manage.php?action=delete&id=${id}`, {
        credentials: "include",
      });
      const result = await res.json();
      if (result.success) {
        alert("✅ 已刪除用戶");
        fetchData(keyword);
      } else {
        alert("❌ 刪除失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      alert("❌ 伺服器錯誤：" + err.message);
    }
  };

  // === 表格 ===
  const exportSingleXLS = (row) => {
    const url = `${API_BASE}/api/admin/export_excel.php?id=${row.id}`;
    window.open(url, "_blank");
  };
  const exportAllXLS = () => {
    const url = `${API_BASE}/api/admin/export_all_excel.php`;
    window.open(url, "_blank");
  };

  // === JSX ===
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h2>📋 用戶資料與檔案管理</h2>
        <div>
          <button className={styles.exportBtn} onClick={exportAllXLS}>
            📦 匯出全部
          </button>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 搜尋姓名、電話或申請編號"
          value={keyword}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <p>載入中...</p>
      ) : data.length === 0 ? (
        <p>目前沒有資料</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>申請編號</th>
              <th>姓名</th>
              <th>電話</th>
              <th>公司名稱</th>
              <th>狀態</th>
              <th>備註</th>
              <th>建立時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.application_no}</td>
                <td>{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.company_name || "-"}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${
                      row.loan_status === "待審核"
                        ? styles.pending
                        : row.loan_status === "已核准"
                        ? styles.approved
                        : row.loan_status === "已拒絕"
                        ? styles.rejected
                        : row.loan_status === "已取消"
                        ? styles.canceled
                        : row.loan_status === "逾期未付"
                        ? styles.overdue
                        : row.loan_status === "逾期已付"
                        ? styles.paidLate
                        : row.loan_status === "已結清"
                        ? styles.closed
                        : ""
                    }`}
                  >
                    {row.loan_status}
                  </span>
                </td>
                <td>{row.note || "-"}</td>
                <td>{row.created_at}</td>
                <td>
                  <div className={styles.actionGroup}>
                    <button
                      className={`${styles.actionBtn} ${styles.fileBtn}`}
                      onClick={() => openFileModal(row)}
                    >
                      📁 檔案
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.editBtn}`}
                      onClick={() => openEditModal(row)}
                    >
                      ✏️ 編輯
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => deleteRow(row.id)}
                    >
                      🗑 刪除
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.exportBtn}`}
                      onClick={() => exportSingleXLS(row)}
                    >
                      📤 匯出
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ======================== ✏️ 編輯 Modal ======================== */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalLarge} ${styles.loanContainer}`}>
            <h3 style={{ color: "#1976d2", marginBottom: "1rem" }}>✏️ 編輯用戶資料</h3>

            {/* === 頁面分支導航 === */}
            <div className={styles.tabs}>
              {["基本資料", "地址資料", "工作資料", "信用與負債", "聯絡人資料"].map(
                (tabName, idx) => (
                  <button
                    key={idx}
                    className={editPage === idx ? styles.activeTab : ""}
                    onClick={() => setEditPage(idx)}
                  >
                    {tabName}
                  </button>
                )
              )}
            </div>

            {/* === 各分頁內容 === */}
            <div className={styles.tabContent}>
              {editPage === 0 && (
                <div className={styles.twoColumn}>
                  <div className={styles.leftCol}>
                    <label>姓名：</label>
                    <input
                      value={form.name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <label>電話：</label>
                    <input
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    <label>身分證字號：</label>
                    <input
                      value={form.id_number || ""}
                      onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                    />
                    <label>Line ID：</label>
                    <input
                      value={form.line_id || ""}
                      onChange={(e) => setForm({ ...form, line_id: e.target.value })}
                    />
                  </div>
                  <div className={styles.rightCol}>
                    <label>生日：</label>
                    <input
                      type="date"
                      value={form.dob || ""}
                      onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    />
                    <label>貸款狀態：</label>
                    <select
                      value={form.loan_status || ""}
                      onChange={(e) => setForm({ ...form, loan_status: e.target.value })}
                    >
                      <option value="待審核">待審核</option>
                      <option value="已核准">已核准</option>
                      <option value="已拒絕">已拒絕</option>
                      <option value="已取消">已取消</option>
                      <option value="逾期未付">逾期未付</option>
                      <option value="逾期已付">逾期已付</option>
                      <option value="已結清">已結清</option>
                    </select>
                    <label>備註：</label>
                    <textarea
                      value={form.note || ""}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {editPage === 1 && (
                <div className={styles.twoColumn}>
                  <div className={styles.leftCol}>
                    <label>戶籍地址：</label>
                    <input
                      value={form.address_home || ""}
                      onChange={(e) => setForm({ ...form, address_home: e.target.value })}
                    />
                    <label>戶籍持有人：</label>
                    <select
                      value={form.holder_home ?? ""}
                      onChange={(e) => setForm({ ...form, holder_home: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="自有">自有</option>
                      <option value="租屋">租屋</option>
                      <option value="親戚">親戚</option>
                    </select>
                  </div>
                  <div className={styles.rightCol}>
                    <label>現居地址：</label>
                    <input
                      value={form.address_residence || ""}
                      onChange={(e) => setForm({ ...form, address_residence: e.target.value })}
                    />
                    <label>現居持有人：</label>
                    <select
                      value={form.holder_residence ?? ""}
                      onChange={(e) => setForm({ ...form, holder_residence: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="自有">自有</option>
                      <option value="租屋">租屋</option>
                      <option value="親戚">親戚</option>
                    </select>
                  </div>
                </div>
              )}

              {editPage === 2 && (
                <div className={styles.twoColumn}>
                  <div className={styles.leftCol}>
                    <label>公司名稱：</label>
                    <input
                      value={form.company_name || ""}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    />
                    <label>公司地址：</label>
                    <input
                      value={form.company_address || ""}
                      onChange={(e) => setForm({ ...form, company_address: e.target.value })}
                    />
                    <label>公司電話：</label>
                    <input
                      value={form.company_phone || ""}
                      onChange={(e) => setForm({ ...form, company_phone: e.target.value })}
                    />
                  </div>
                  <div className={styles.rightCol}>
                    <label>職稱：</label>
                    <input
                      value={form.job_title || ""}
                      onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                    />
                    <label>薪資：</label>
                    <input
                      type="number"
                      value={form.salary || ""}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    />
                    <label>勞保狀態：</label>
                    <select
                      value={form.labor_insurance || ""}
                      onChange={(e) => setForm({ ...form, labor_insurance: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>
                    <label>工作年資：</label>
                    <input
                      type="number"
                      value={form.work_years || ""}
                      onChange={(e) => setForm({ ...form, work_years: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {editPage === 3 && (
                <div className={styles.twoColumn}>
                  <div className={styles.leftCol}>
                    <label>銀行信用狀況：</label>
                    <select
                      value={
                        // ✅ 若後端傳 "良好"、"普通"、"不良"，自動歸類成 "正常"
                        ["良好", "普通", "不良"].includes(form.credit_status)
                          ? "正常"
                          : form.credit_status || ""
                      }
                      onChange={(e) => setForm({ ...form, credit_status: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="正常">正常</option>
                      <option value="呆賬">呆賬</option>
                      <option value="警示戶">警示戶</option>
                    </select>

                    <label>是否有信用卡：</label>
                    <select
                      value={form.has_credit_card || ""}
                      onChange={(e) => setForm({ ...form, has_credit_card: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>

                    <label>是否有銀行貸款：</label>
                    <select
                      value={form.has_bank_loan || ""}
                      onChange={(e) => setForm({ ...form, has_bank_loan: e.target.value })}
                    >
                      <option value="">請選擇</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>

                    <label>是否有融資貸款：</label>
                    <select
                      value={form.has_financing_loan || ""}
                      onChange={(e) =>
                        setForm({ ...form, has_financing_loan: e.target.value })
                      }
                    >
                      <option value="">請選擇</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>

                    <label>是否有信貸：</label>
                    <select
                      value={form.has_personal_loan || ""}
                      onChange={(e) =>
                        setForm({ ...form, has_personal_loan: e.target.value })
                      }
                    >
                      <option value="">請選擇</option>
                      <option value="有">有</option>
                      <option value="無">無</option>
                    </select>
                  </div>

                  <div className={styles.rightCol}>
                    <label>債務明細：</label>
                    <textarea
                      value={form.debt_detail || ""}
                      onChange={(e) => setForm({ ...form, debt_detail: e.target.value })}
                      rows={8}
                    />
                  </div>
                </div>
              )}

              {editPage === 4 && (
                <div className={styles.contactRow}>
                  <div className={styles.contactGroup}>
                    <label>聯絡人一：</label>
                    <input
                      value={form.contact1_name || ""}
                      onChange={(e) => setForm({ ...form, contact1_name: e.target.value })}
                    />
                    <label>關係：</label>
                    <input
                      value={form.contact1_relation || ""}
                      onChange={(e) => setForm({ ...form, contact1_relation: e.target.value })}
                    />
                    <label className={styles.phoneLabel}>電話：</label>
                    <input
                      className={styles.phoneInput}
                      value={form.contact1_phone || ""}
                      onChange={(e) => setForm({ ...form, contact1_phone: e.target.value })}
                    />
                  </div>

                  <div className={styles.contactGroup}>
                    <label>聯絡人二：</label>
                    <input
                      value={form.contact2_name || ""}
                      onChange={(e) => setForm({ ...form, contact2_name: e.target.value })}
                    />
                    <label>關係：</label>
                    <input
                      value={form.contact2_relation || ""}
                      onChange={(e) => setForm({ ...form, contact2_relation: e.target.value })}
                    />
                    <label className={styles.phoneLabel}>電話：</label>
                    <input
                      className={styles.phoneInput}
                      value={form.contact2_phone || ""}
                      onChange={(e) => setForm({ ...form, contact2_phone: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalBtns}>
              <button onClick={saveEdit}>💾 儲存</button>
              <button onClick={() => setShowEditModal(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== 📁 檔案 Modal ======================== */}
      {showFileModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <h3>📁 {selected?.name} 的上傳檔案</h3>

            <div className={styles.tabs}>
              <button
                className={activeTab === "main" ? styles.activeTab : ""}
                onClick={() => setActiveTab("main")}
              >
                主要檔案
              </button>
              <button
                className={activeTab === "follow" ? styles.activeTab : ""}
                onClick={() => setActiveTab("follow")}
              >
                後續附件
              </button>
            </div>

            <div className={styles.fileList}>
              {activeTab === "main"
                ? renderFileList(files)
                : renderFileList(followupFiles, true)}
            </div>

            {activeTab === "follow" && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <label className={styles.uploadBtn}>
                  ⬆ 上傳後續附件
                  <input
                    type="file"
                    onChange={handleUploadFollowup}
                    style={{ display: "none" }}
                  />
                </label>
                {uploading && <p>上傳中...</p>}
              </div>
            )}

            <div className={styles.modalBtns}>
              <button onClick={() => setShowFileModal(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
