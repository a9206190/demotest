import React, { useEffect, useState } from "react";
import styles from "./Loan.module.css";

export default function Loan() {
  const [loans, setLoans] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    try {
      const res = await fetch("http://localhost:8000/src/admin/api/get_loan.php");
      const result = await res.json();
      if (result.success) {
        setLoans(result.data);
        setFiltered(result.data);
      } else {
        console.error("❌ 後端錯誤：", result.error);
      }
    } catch (err) {
      console.error("❌ 無法讀取資料", err);
    }
  }


  function handleSearch(e) {
    const keyword = e.target.value.toLowerCase().trim();
    setSearch(keyword);

    setFiltered(
      loans.filter((l) => {
        const nameMatch = l.name && l.name.toLowerCase().includes(keyword);
        const phoneMatch = l.phone && l.phone.includes(keyword);
        const appNoMatch =
          l.application_no && l.application_no.toLowerCase().includes(keyword);
        return nameMatch || phoneMatch || appNoMatch;
      })
    );
  }


  async function handleDelete(id) {
    if (!window.confirm("確定要刪除此申請紀錄嗎？")) return;
    await fetch("http://localhost:8000/src/admin/api/delete_loan.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLoans((prev) => prev.filter((l) => l.id !== id));
    setToast("✅ 已刪除紀錄");
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className={styles.mainContent}>
      <h2>💼 核貸紀錄</h2>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 搜尋姓名、電話或申請編號..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      <p style={{ color: "red" }}>目前筆數：{filtered.length}</p>

      <table className={styles.loanTable}>
        <thead>
          <tr>
            <th>申請編號</th>
            <th>姓名</th>
            <th>電話</th>
            <th>合約書</th>
            <th>狀態</th>
            <th>最後更新</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#777" }}>
                無符合的資料
              </td>
            </tr>
          ) : (
            filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.application_no || "-"}</td>
                <td>{l.name}</td>
                <td>{l.phone}</td>
                <td>
                  <button
                    className={styles.contractBtn}
                    onClick={() => setSelected({ ...l })}
                  >
                    查看
                  </button>
                </td>
                <td>
                  <span
                    className={`${styles.statusTag} ${
                      styles[`status_${l.loan_status}`] || ""
                    }`}
                  >
                    {l.loan_status}
                  </span>
                </td>
                <td>
                  {l.updated_at
                    ? new Date(l.updated_at).toLocaleString("zh-TW")
                    : "-"}
                </td>
                <td>
                  <button
                    className={`${styles.actionBtn} ${styles.editBtn}`}
                    onClick={() => setEditTarget({ ...l })}
                  >
                    ✏️ 編輯
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => handleDelete(l.id)}
                  >
                    🗑️ 刪除
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selected && (
        <LoanModal
          selected={selected}
          onClose={() => setSelected(null)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {editTarget && (
        <EditModal
          loan={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (updated) => {
            await fetch("http://localhost:8000/src/admin/api/update_loan_status.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updated),
            });

            // 更新前端
            setLoans((prev) =>
              prev.map((l) =>
                l.id === updated.id
                  ? { ...l, loan_status: updated.loan_status, note: updated.note }
                  : l
              )
            );
            setFiltered((prev) =>
              prev.map((l) =>
                l.id === updated.id
                  ? { ...l, loan_status: updated.loan_status, note: updated.note }
                  : l
              )
            );

            setEditTarget(null);
            setToast("✅ 狀態與備註已更新");
            setTimeout(() => setToast(null), 2000);
          }}
        />
      )}
    </div>
  );
}

/* === 編輯 Modal === */
function EditModal({ loan, onClose, onSave }) {
  const [status, setStatus] = useState(loan.loan_status || "待審核");
  const [note, setNote] = useState(loan.note || "");

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} style={{ maxWidth: "500px" }}>
        <div className={styles.modalHeader}>
          <h3>✏️ 修改狀態 - {loan.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✖
          </button>
        </div>

        <div className={styles.editForm}>
          <label>📋 狀態：</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={styles.statusSelect}
          >
            {[
              "待審核",
              "已核准",
              "已拒絕",
              "已取消",
              "逾期未付",
              "逾期已付",
              "已結清",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label>📝 備註：</label>
          <textarea
            rows="4"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="請輸入備註內容..."
            className={styles.noteInput}
          />

          <div className={styles.editActions}>
            <button
              className={`${styles.actionBtn} ${styles.saveBtn}`}
              onClick={() => onSave({ id: loan.id, loan_status: status, note })}
            >
              💾 儲存
            </button>
            <button className={styles.cancelBtn} onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* === Loan 詳情 Modal（保留你的原分頁）=== */
function LoanModal({ selected, onClose, activeTab, setActiveTab }) {
  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("zh-TW") : "未提供";

  const scheduleData = (() => {
    try {
      return JSON.parse(selected.schedule_json || "[]");
    } catch {
      return [];
    }
  })();

  const contractText = `
  <h2>金錢消費借貸契約</h2>
  <p>一、甲方願將新臺幣壹萬貳仟元整貸與乙方。</p>
  <p>二、還款日期與金額：</p>
  <p>(1) 2025/10/27：新臺幣參仟元整</p>
  <p>(2) 2025/11/03：新臺幣參仟元整</p>
  <p>(3) 2025/11/10：新臺幣參仟元整</p>
  <p>(4) 2025/11/17：新臺幣參仟元整</p>
  <p>三、乙方同意創業佳數位科技有限公司進行徵信調查，並支付費用參仟伍佰元整。</p>
  <p>四、開辦費：伍佰元整。</p>
  <p>五、違約金：伍萬元整。</p>
  <p>七、訴訟管轄：臺灣桃園地方法院。</p>
  <p>申貸日期：${formatDate(selected.apply_date)}</p>
  <p>首次還款日：${formatDate(selected.first_due_date)}</p>
  `;

  return (
    
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>🧾 核貸詳情 - {selected.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✖
          </button>
        </div>
        
        {/* 分頁 */}
        <div className={styles.tabs}>
          {["overview", "contract", "schedule", "uploads"].map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${
                activeTab === tab ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview"
                ? "總覽"
                : tab === "contract"
                ? "合約"
                : tab === "schedule"
                ? "期數"
                : "上傳檔案"
                }
            </button>
          ))}
          <a
            href={`http://localhost:8000/src/admin/api/download_contract.php?application_no=${selected.application_no}`}
            target="_blank"
            rel="noreferrer"
            className={styles.pdfBtn}
          >
            📄 下載PDF合約
          </a>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "overview" && (
            <div className={styles.detailBox}>
              <p>📄 申請編號：{selected.application_no}</p>
              <p>姓名：{selected.name}</p>
              <p>電話：{selected.phone}</p>
              <p>身份證字號：{selected.id_number || "未填寫"}</p>
              <p>狀態：{selected.loan_status}</p>
              <p>備註：{selected.note || "無"}</p>
              <p>申貸日：{formatDate(selected.apply_date)}</p>
              <p>首次還款日：{formatDate(selected.first_due_date)}</p>
            </div>
          )}

          {activeTab === "contract" && (
            <div className={styles.contractView}>
              <div
                className={styles.contractText}
                dangerouslySetInnerHTML={{ __html: contractText }}
              />
              <Uploads applicationId={selected.id} onlySignature />
            </div>
          )}

          {activeTab === "schedule" && (
            <div>
              {scheduleData.length === 0 ? (
                <p>尚無期數資料</p>
              ) : (
                scheduleData.map((s, i) => (
                  <p key={i}>
                    第 {i + 1} 期：NT${s.amount}，到期日 {s.due_date || s.date}
                  </p>
                ))
              )}
            </div>
          )}

          {activeTab === "uploads" && <Uploads applicationId={selected.id} />}
        </div>
      </div>
    </div>
  );
}

/* === 上傳檔案 === */
function Uploads({ applicationId, onlySignature = false }) {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:8000/src/admin/api/get_loan_files.php?id=${applicationId}`)
      .then((res) => res.json())
      .then((r) => {
        if (r.success) {
          const list = onlySignature
            ? r.data.filter((f) => f.file_type === "signature")
            : r.data;
          setFiles(list);
        }
      })
      .catch((err) => console.error("❌ 讀取上傳檔案失敗", err));
  }, [applicationId, onlySignature]);

  if (files.length === 0) return <p>無上傳檔案</p>;

  return (
    <div className={styles.uploads}>
      {files.map((f) => (
        <div key={f.id} className={styles.uploadItem}>
          <a href={`/${f.file_path}`} target="_blank" rel="noreferrer">
            <img
              src={`/${f.file_path}`}
              alt={f.file_type}
              className={styles.uploadImg}
            />
          </a>
          <p>{f.file_type}</p>
          <small>
            上傳時間：
            {f.uploaded_at
              ? new Date(f.uploaded_at).toLocaleString("zh-TW")
              : "-"}
          </small>
        </div>
      ))}
    </div>
  );
}
