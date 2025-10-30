import React, { useEffect, useState } from "react";
import styles from "./Loan.module.css";
import API, { fetchAPI, API_BASE } from "@config/apiConfig";


export default function Loan() {
  const [loans, setLoans] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);

  
  useEffect(() => {
    initSession();
  }, []);
  async function fetchLoans() {
    const result = await fetchAPI(API.GET_LOAN);
    if (result.success) {
      setLoans(result.data);
      setFiltered(result.data);
    } else {
      alert("❌ 無法載入資料：" + (result.error || "伺服器錯誤"));
    }
  }

  // ✅ 再定義 initSession
  async function initSession() {
    const session = await fetchAPI(API.CHECK_SESSION);
    if (!session.success) {
      alert("❌ 尚未登入或 session 已失效");
      window.location.href = "/admin/login";
      return;
    }
    fetchLoans(); // 現在 eslint 不會報錯了
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

  // ✅ 刪除貸款紀錄（使用統一 API 常數 + credentials）
async function handleDelete(id) {
  if (!window.confirm("確定要刪除此申請紀錄嗎？")) return;
  try {
    const result = await fetchAPI(API.DELETE_LOAN, {
      method: "POST",
      body: JSON.stringify({ id }),
    });

    if (result.success) {
      setLoans((prev) => prev.filter((l) => l.id !== id));
      setFiltered((prev) => prev.filter((l) => l.id !== id));
      showToast("✅ 已刪除紀錄");
    } else {
      alert("❌ 刪除失敗：" + result.error);
    }
  } catch (err) {
    alert("❌ 伺服器錯誤：" + err.message);
  }
}


  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className={styles.mainContent}>
      <h2>💼 申請紀錄</h2>

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
          API_BASE={API_BASE}
        />
      )}

      {editTarget && (
        <EditModal
          loan={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (updated) => {
            const result = await fetchAPI(API.UPDATE_LOAN, {
              method: "POST",
              body: JSON.stringify(updated),
            });
            if (result.success) {
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
              showToast("✅ 狀態與備註已更新");
            } else {
              alert("❌ 更新失敗：" + result.error);
            }
            setEditTarget(null);
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

/* === Loan 詳情 Modal === */
function LoanModal({ selected, onClose, activeTab, setActiveTab, API_BASE }) {
  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("zh-TW") : "未提供";

  const [scheduleData, setScheduleData] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // ✅ 切換到 “期數” 分頁時自動抓資料
  useEffect(() => {
    if (activeTab === "schedule") fetchSchedule();
  }, [activeTab]);

  async function fetchSchedule() {
    setLoadingSchedule(true);
    const res = await fetchAPI(`${API.GET_LOAN}?action=schedule&id=${selected.application_no}`);
    if (res.success) setScheduleData(res.data);
    else console.error("❌ 無法讀取期數資料：", res.error);
    setLoadingSchedule(false);
  }


  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <h3>🧾 核貸詳情 - {selected.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✖
          </button>
        </div>

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
                : "上傳檔案"}
            </button>
          ))}
          <a
            href={`${API.DOWNLOAD_CONTRACT}?application_no=${selected.application_no}`}
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
              <div className={styles.contractText}>
                {selected.contract_html && selected.contract_html.trim() !== "" ? (
                  // 如果後端有提供 HTML 合約，直接顯示
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        selected.contract_html.includes("<p>") ||
                        selected.contract_html.includes("<div>") ||
                        selected.contract_html.includes("<br>")
                          ? selected.contract_html
                          : selected.contract_html.replace(/\n/g, "<br>"),
                    }}
                  />
                ) : (
                  // ✅ 預設自動計算契約書
                  <div style={{ lineHeight: "1.8em", whiteSpace: "pre-line" }}>
                    <h4 style={{ textAlign: "center", marginBottom: "1rem" }}>
                      金錢消費借貸契約
                    </h4>
                    <p>一、甲方願將新臺幣壹萬貳仟元整貸與乙方。</p>
                    <p>二、還款日期與金額：</p>

                    {/* ✅ 自動生成期數明細 */}
                    <div style={{ marginLeft: "1rem" }}>
                      {(() => {
                        const firstDue = selected.first_due_date
                          ? new Date(selected.first_due_date)
                          : new Date("2025-10-28");

                        const total = Number(selected.loan_amount) || 12000;
                        const periods = Number(selected.installments) || 4;
                        const each = Math.round(total / periods);

                        const result = [];
                        for (let i = 0; i < periods; i++) 
                          {
                          const dueDate = new Date(firstDue);
                          dueDate.setDate(firstDue.getDate() + i * 7);
                          const formatted = dueDate.toISOString().split("T")[0]; // yyyy-MM-dd
                          result.push(
                            <p key={i}>
                              第 ({i + 1}) 期 {formatted}：新臺幣
                              {each.toLocaleString()}元整
                            </p>
                          );
                        }
                        return result;
                      })()}
                    </div>

                    <p>
                      三、乙方同意創業佳數位科技有限公司（下簡稱創業佳）進行必要之徵信調查，
                      並支付徵信費用參仟伍佰元整；乙方應於甲方撥款前支付予創業佳，
                      或由甲方以前揭借款支付予創業佳。
                    </p>

                    <p>四、開辦費：伍佰元整。</p>
                    <p>
                      五、因違反本契約之權利義務致甲方受有損害，
                      乙方應賠償懲罰性違約金伍萬元整予甲方。
                    </p>
                    <p>
                      六、貸款核準最終解釋權歸於本公司，
                      若未成功核貸，本資料將刪除銷毀。
                    </p>
                    <p>
                      七、甲乙雙方同意因本契約所衍生之一切訴訟，
                      以臺灣桃園地方法院為第一審管轄法院。
                    </p>

                    {/* ✅ 自動計算日期顯示 */}
                    <p style={{ marginTop: "1rem" }}>
                      申貸日期：
                      {selected.apply_date
                        ? new Date(selected.apply_date).toLocaleDateString("zh-TW")
                        : "2025/10/21"}
                    </p>
                    <p>
                      首次還款日：
                      {selected.first_due_date
                        ? new Date(selected.first_due_date).toLocaleDateString("zh-TW")
                        : "2025/10/28"}
                    </p>

                    <p style={{ marginTop: "1rem" }}>
                      立契約書人
                      <br />
                      貸與人：富士旺實業股份有限公司（以下簡稱甲方）
                      <br />
                      借用人：{selected.name || "（以下簡稱乙方）"}
                    </p>
                  </div>
                )}
              </div>

              {/* 簽名上傳區 */}
              <Uploads
                applicationId={selected.application_no}
                onlySignature
                API_BASE={API_BASE}
              />
            </div>
          )}




          {activeTab === "schedule" && (
            <div style={{ lineHeight: "1.8em", whiteSpace: "pre-line" }}>
              {loadingSchedule ? (
                <p>載入中...</p>
              ) : (
                (() => {
                  // ✅ 優先使用 DB 中的 schedule_json
                  let parsed = [];
                  if (Array.isArray(selected.schedule) && selected.schedule.length > 0) {
                    parsed = selected.schedule;
                  }
                  else if (selected.schedule_json) {
                    try {
                      parsed =
                        typeof selected.schedule_json === "string"
                          ? JSON.parse(selected.schedule_json)
                          : selected.schedule_json;
                    } catch (err) {
                      console.warn("❌ schedule_json 解析錯誤：", err);
                      parsed = [];
                    }
                  }

                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((item, i) => {
                      const date = item.due_date || item.date || "-";
                      const amount = Number(item.amount) || 0;
                      const status = item.status || "";
                      return (
                        <p key={i}>
                          第 ({i + 1}) 期 {date}：新臺幣
                          {amount.toLocaleString()} 元整{" "}
                          {status && `（${status}）`}
                        </p>
                      );
                    });
                  }

                  if (scheduleData.length > 0) {
                    return scheduleData.map((s, i) => (
                      <p key={i}>
                        第 ({i + 1}) 期 {s.due_date || s.date}：新臺幣
                        {Number(s.amount).toLocaleString()} 元整
                      </p>
                    ));
                  }

                  // ✅ 若沒有資料 → fallback 自動計算
                  const firstDue = selected.first_due_date
                    ? new Date(selected.first_due_date)
                    : new Date("2025-10-28");
                  const total = Number(selected.loan_amount) || 12000;
                  const periods = Number(selected.installments) || 4;
                  const each = Math.round(total / periods);

                  const result = [];
                  for (let i = 0; i < periods; i++) {
                    const dueDate = new Date(firstDue);
                    dueDate.setDate(firstDue.getDate() + i * 7);
                    const formatted = dueDate.toISOString().split("T")[0];
                    result.push(
                      <p key={i}>
                        第 ({i + 1}) 期 {formatted}：新臺幣
                        {each.toLocaleString()} 元整
                      </p>
                    );
                  }
                  return result;
                })() 
              )}
            </div>
          )}

          {activeTab === "uploads" && <Uploads applicationId={selected.application_no} API_BASE={API_BASE} />}
        </div>
      </div>
    </div>
  );
}

/* === 上傳檔案 === */
function Uploads({ applicationId, onlySignature = false, API_BASE }) {
  const [files, setFiles] = useState([]);

  const fileTypeMap = {
    id_front: "身分證正面",
    id_back: "身分證反面",
    nhic_quick: "健保卡",
    bankbook: "存摺封面",
    selfie: "自拍照",
    second_id: "第二證件",
    signature: "簽名檔",
    admin_attachment: "行政附件",
  };

  useEffect(() => {
    async function loadFiles() {
      const res = await fetchAPI(`${API.GET_LOAN_FILES}?id=${applicationId}`);
      if (res.success) {
        let list = res.data || [];
        if (onlySignature) {
          list = list.filter((f) => {
            const t = (f.file_type || "").toLowerCase();
            return t === "signature" || t.includes("簽名");
          });
        }
        setFiles(list);
      } else {
        console.error("❌ 無法讀取上傳檔案：", res.error);
      }
    }
    loadFiles();
  }, [applicationId, onlySignature]);

  if (!files || files.length === 0) return <p>無上傳檔案</p>;

  return (
    <div className={styles.uploads}>
      {files.map((f) => {
        const displayType = fileTypeMap[f.file_type] || f.file_type || "未分類";

        // ✅ 智能判斷路徑：
        // 如果是完整網址 (http開頭) → 直接用
        // 否則自動補上 API_BASE
        let fileUrl = f.file_path?.trim() || "";
        if (!/^https?:\/\//i.test(fileUrl)) {
          fileUrl = `${API_BASE.replace(/\/$/, "")}/${fileUrl.replace(/^\/+/, "")}`;
        }

        return (
          <div
            key={f.id}
            className={`${styles.uploadItem} ${
              f.file_type === "signature" ? styles.signature : ""
            }`}
          >
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <img
                src={fileUrl}
                alt={displayType}
                className={styles.uploadImg}
                onError={(e) => {
                  e.target.style.border = "2px dashed red";
                  e.target.alt = "❌ 圖片載入失敗";
                }}
              />
            </a>
            <p>{displayType}</p>
            <small>
              上傳時間：
              {f.uploaded_at
                ? new Date(f.uploaded_at).toLocaleString("zh-TW")
                : "-"}
            </small>
          </div>
        );
      })}
    </div>
  );
}
