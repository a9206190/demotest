import React, { useState, useEffect } from "react";
import styles from "./Loan.module.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from "date-fns/locale";

export default function Loan() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // === 上傳欄位設定 ===
  const uploadFields = [
    { name: "idFront", label: "身分證正面" },
    { name: "idBack", label: "身分證背面" },
    { name: "healthCard", label: "健保卡" },
    { name: "bankBook", label: "存摺封面" },
    { name: "selfie", label: "手持自拍照" },
    { name: "secondId", label: "第二證件" },
  ];

  // === 初始化：還原 sessionStorage ===
  useEffect(() => {
    const savedStep = sessionStorage.getItem("loan_step");
    const savedAgree = sessionStorage.getItem("loan_agree");
    const savedForm = sessionStorage.getItem("loan_form");

    if (savedStep) setStep(parseInt(savedStep));
    if (savedAgree) setAgree(savedAgree === "true");
    if (savedForm) setFormData(JSON.parse(savedForm));
  }, []);

  // === 自動保存 ===
  useEffect(() => {
    sessionStorage.setItem("loan_step", step);
    sessionStorage.setItem("loan_agree", agree);
    sessionStorage.setItem("loan_form", JSON.stringify(formData));
  }, [step, agree, formData]);

  // === Step6：自動跳轉 Line@ ===
  useEffect(() => {
    if (step !== 6) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = "https://line.me/R/ti/p/@335lmovr";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // === 下一步 / 上一步 ===
  const nextStep = () => {
    if (step === 1 && !agree) {
      alert("⚠️ 請勾選『本人已閱讀並同意提供個人資料』後再繼續。");
      return;
    }
    if (step === 3) {
      const allUploaded = uploadFields.every((f) => formData[f.name]);
      if (!allUploaded) {
        alert("⚠️ 請上傳所有六張證件照片後再繼續。");
        return;
      }
    }
    if (step < 6) setStep(step + 1);
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // === 表單輸入 ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // === 上傳檔案 ===
  const handleFileChange = (e, name) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [name]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // === 簽名畫布 ===
  useEffect(() => {
    if (!formData.showSignModal) return;
    const canvas = document.getElementById("signatureCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const startDraw = (e) => {
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    };
    const endDraw = () => (drawing = false);

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", endDraw);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [formData.showSignModal]); // ✅ 固定依賴，長度不變

  // === 自動生成期數與金額 ===
  const getPaySchedule = () => {
    const total = parseInt(formData.loanAmount || 12000, 10);
    const base = Math.floor(total / 4);
    const remainder = total % 4;
    const payAmounts = [base + remainder, base, base, base];
    const start = new Date();
    const payDates = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i * 7);
      return `${d.getFullYear()}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`;
    });
    return { total, payDates, payAmounts };
  };
  const schedule = getPaySchedule();

  const steps = [
    "個資告知暨提供同意",
    "填寫個人申請資訊",
    "上傳證件",
    "借貸合約簽名",
    "預覽合約",
    "完成",
  ];

  // === 送出申請 ===
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/submit_loan.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`伺服器錯誤 (${res.status})：${text}`);
      }

      const result = await res.json();
      if (result.success) {
        alert(`✅ 申請成功！申請編號：${result.application_no}`);
        setStep(6);
        sessionStorage.clear();
      } else {
        alert("❌ 送出失敗：" + (result.error || "未知錯誤"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ 無法連線或伺服器錯誤：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  // === JSX 渲染 ===
  return (
    <div className={styles.loanContainer}>
      {/* === 步驟條 === */}
      <div className={styles.stepBar}>
        {steps.map((label, i) => (
          <div
            key={i}
            className={`${styles.stepItem} ${
              step === i + 1 ? styles.active : step > i + 1 ? styles.completed : ""
            }`}
          >
            <div className={styles.stepCircle}>{i + 1}</div>
            <p className={styles.stepLabel}>{label}</p>
          </div>
        ))}
      </div>

      {/* === STEP 1：個資告知暨提供同意 === */}
      {step === 1 && (
        <div className={styles.stepBox}>
          <h2>步驟一：個資告知暨提供同意</h2>
          <p>
            為提供您貸款相關服務，本公司將蒐集、處理及利用您的個人資料，包含姓名、聯絡方式、
            身分證字號、財務及信用往來等；使用目的為核貸審查、身份確認、聯繫通知等。
          </p>
          <label className={styles.agreeLabel}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            本人已閱讀並同意提供個人資料供核貸審查使用。
          </label>
          <div className={styles.btnGroup}>
            <button onClick={nextStep} className={styles.nextBtn}>下一步 →</button>
          </div>
        </div>
      )}

      {/* === STEP 2：個人資料 === */}
      {step === 2 && (
        <div className={styles.stepBox}>
          <h2>步驟二：填寫申請資訊</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              nextStep();
            }}
            className={styles.formGrid}
          >
            {/* 個人與公司資料區 */}
            <div className={styles.twoColumn}>
              {/* 左側 */}
              <div className={styles.leftCol}>
                <label>★ 姓名</label>
                <input name="name" value={formData.name || ""} onChange={handleInputChange} required />
                <label>★ 聯絡電話</label>
                <input name="phone" value={formData.phone || ""} onChange={handleInputChange} required />
                <label>★ 身分證字號</label>
                <input name="idNumber" value={formData.idNumber || ""} onChange={handleInputChange} required />
                <label>★ LINE ID</label>
                <input name="lineId" value={formData.lineId || ""} onChange={handleInputChange} required />
                <label>★ 出生年月日</label>
                <DatePicker
                  selected={formData.birthDate ? new Date(formData.birthDate) : null}
                  onChange={(d) =>
                    setFormData((p) => ({ ...p, birthDate: d ? d.toISOString().split("T")[0] : "" }))
                  }
                  dateFormat="yyyy-MM-dd"
                  locale={zhTW}
                  className={styles.customDatePicker}
                />
                <label>★ 戶籍地址</label>
                <input name="address" value={formData.address || ""} onChange={handleInputChange} required />
                <label>戶籍持有人</label>
                <input name="holderHome" value={formData.holderHome || ""} onChange={handleInputChange} />
              </div>

              {/* 右側 */}
              <div className={styles.rightCol}>
                <label>公司名稱</label>
                <input name="companyName" value={formData.companyName || ""} onChange={handleInputChange} />
                <label>公司地址</label>
                <input name="companyAddress" value={formData.companyAddress || ""} onChange={handleInputChange} />
                <label>公司電話</label>
                <input name="companyPhone" value={formData.companyPhone || ""} onChange={handleInputChange} />
                <label>職稱</label>
                <input name="jobTitle" value={formData.jobTitle || ""} onChange={handleInputChange} />
                <label>月薪</label>
                <input name="salary" value={formData.salary || ""} onChange={handleInputChange} />
                <label>工作年資</label>
                <input name="workYears" value={formData.workYears || ""} onChange={handleInputChange} />
                <label>居住地</label>
                <input name="resident" value={formData.resident || ""} onChange={handleInputChange} />
                <label>居住地持有人</label>
                <input name="holderResidence" value={formData.holderResidence || ""} onChange={handleInputChange} />
              </div>
            </div>
                  <hr className={styles.divider} />
              <div className={styles.contactRow}>
                <label>聯絡人一姓名</label>
                <input name="contact1Name" value={formData.contact1Name || ""} onChange={handleInputChange} />

                <label>關係</label>
                <input name="contact1Relation" value={formData.contact1Relation || ""} onChange={handleInputChange} />

                <label>電話</label>
                <input name="contact1Phone" value={formData.contact1Phone || ""} onChange={handleInputChange} />

                <label>聯絡人二姓名</label>
                <input name="contact2Name" value={formData.contact2Name || ""} onChange={handleInputChange} />

                <label>關係</label>
                <input name="contact2Relation" value={formData.contact2Relation || ""} onChange={handleInputChange} />

                <label>電話</label>
                <input name="contact2Phone" value={formData.contact2Phone || ""} onChange={handleInputChange} />
              </div>

            {/* 信用與負債資料 */}
            <div className={styles.sixColRow}>
              {[
                { name: "laborInsurance", label: "★ 有無勞保" },
                { name: "hasBankLoan", label: "★ 有無銀行貸款" },
                { name: "hasFinanceLoan", label: "★ 有無融資貸款" },
                { name: "hasPersonalLoan", label: "★ 有無民間貸款" },
                { name: "creditStatus", label: "★ 信用狀況" },
                { name: "hasCreditCard", label: "★ 有無信用卡" },
              ].map((f) => (
                <div key={f.name}>
                  <label>{f.label}</label>
                  <select name={f.name} value={formData[f.name] || ""} onChange={handleInputChange} required>
                    <option value="">請選擇</option>
                    {f.name === "creditStatus" ? (
                      <>
                        <option value="良好">良好</option>
                        <option value="普通">普通</option>
                        <option value="較差">較差</option>
                      </>
                    ) : (
                      <>
                        <option value="有">有</option>
                        <option value="無">無</option>
                      </>
                    )}
                  </select>
                </div>
              ))}
            </div>

            <hr className={styles.divider} />

            <div className={styles.fullWidth}>
              <label>★ 詳細說明目前負債狀況</label>
              <textarea
                name="debtDetail"
                placeholder="請輸入目前負債狀況，例如貸款金額、剩餘期數等"
                value={formData.debtDetail || ""}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className={styles.btnGroup}>
              <button type="button" className={styles.prevBtn} onClick={prevStep}>
                ← 上一步
              </button>
              <button type="submit" className={styles.nextBtn}>
                下一步 →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === STEP 3：上傳證件 === */}
      {step === 3 && (
        <div className={styles.stepBox}>
          <h2>步驟三：上傳證件</h2>
          <div className={styles.uploadGrid}>
            {uploadFields.map((f) => (
              <div key={f.name} className={styles.uploadCard}>
                <label className={styles.uploadLabel}>{f.label}</label>
                {formData[f.name] ? (
                  <div className={styles.previewBox}>
                    <img src={formData[f.name]} alt={f.label} className={styles.previewImage} />
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => setFormData((p) => ({ ...p, [f.name]: "" }))}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className={styles.uploadPlaceholder}>
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, f.name)} />
                    <span>📷 點此上傳</span>
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className={styles.btnGroup}>
            <button className={styles.prevBtn} onClick={prevStep}>
              ← 上一步
            </button>
            <button className={styles.nextBtn} onClick={nextStep}>
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* === STEP 4：合約與簽名 === */}
        {step === 4 && (
          <div className={styles.stepBox}>
            <h2>步驟四：借貸合約簽名</h2>

            {/* ✅ 借款金額與條款區 */}
            <div className={styles.loanAmountBox}>
              借款金額（元）：{schedule.total.toLocaleString()}
            </div>

            <div className={styles.contractBox}>
              <h3 className={styles.contractBoxTitle}>金錢消費借貸契約</h3>
              <p>一、甲方願將新臺幣壹萬貳仟元整貸與乙方。</p>
              <p>二、還款日期與金額：</p>
              <ul>
                {schedule.payDates.map((date, i) => (
                  <li key={i}>
                  第  {i + 1}  期 {date}：新臺幣 {schedule.payAmounts[i].toLocaleString()} 元整
                  </li>
                ))}
              </ul>
              <p>
                三、乙方同意創業佳數位科技有限公司（下簡稱「創業佳」）進行必要之徵信調查，並支付徵信費用參仟伍佰元整；
                乙方應於甲方撥款前支付予創業佳，或由甲方以前揭借款支付予創業佳。
              </p>
              <p>四、開辦費：伍佰元整。</p>
              <p>五、因違反本契約致甲方受損害，乙方應賠償懲罰性違約金伍萬元整予甲方。</p>
              <p>六、貸款核準最終解釋權歸於本公司，若未成功核貸，本資料將刪除銷毀。</p>
              <p>七、甲乙雙方同意因本契約所衍生之一切訴訟以臺灣桃園地方法院為第一審管轄法院。</p>

              <p>申貸日期：{new Date().toLocaleDateString("zh-TW")}</p>
              <p>首次還款日：{schedule.payDates[0]}</p>

              <p>立契約書人：</p>
              <p>貸與人：富士旺實業股份有限公司（以下簡稱甲方）</p>
              <p>借用人：（以下簡稱乙方）</p>
            </div>

            <div className={styles.contractSignatureTitle}>借款人簽名：</div>

            {/* ✅ 簽名區塊 */}
            {!formData.signature && (
              <button
                type="button"
                className={styles.startSignBtn}
                onClick={() => setFormData((p) => ({ ...p, showSignModal: true }))}
              >
                ✍️ 開始簽名
              </button>
            )}
            {formData.signature && (
              <div className={styles.signaturePreview}>
                <img src={formData.signature} alt="簽名" />
                <button
                  className={styles.clearBtn}
                  onClick={() => setFormData((p) => ({ ...p, signature: "" }))}
                >
                  重新簽名
                </button>
              </div>
            )}

            {/* ✅ 簽名 Modal 彈出視窗 */}
            {formData.showSignModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3>請於下方簽名</h3>
                  <canvas
                    id="signatureCanvas"
                    className={styles.signatureCanvas}
                    width={500}
                    height={200}
                  ></canvas>
                  <div className={styles.signatureButtons}>
                    <button
                      className={styles.clearBtn}
                      onClick={() => {
                        const canvas = document.getElementById("signatureCanvas");
                        const ctx = canvas.getContext("2d");
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                      }}
                    >
                      清除
                    </button>
                    <button
                      className={styles.saveBtn}
                      onClick={() => {
                        const canvas = document.getElementById("signatureCanvas");
                        const tempCanvas = document.createElement("canvas");
                        tempCanvas.width = canvas.width;
                        tempCanvas.height = canvas.height;
                        const tempCtx = tempCanvas.getContext("2d");
                        tempCtx.fillStyle = "#fff";
                        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                        tempCtx.drawImage(canvas, 0, 0);
                        const dataUrl = tempCanvas.toDataURL("image/png");
                        setFormData((p) => ({
                          ...p,
                          signature: dataUrl,
                          showSignModal: false,
                        }));
                      }}
                    >
                      儲存簽名
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() =>
                        setFormData((p) => ({ ...p, showSignModal: false }))
                      }
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ 下一步 / 上一步 */}
            <div className={styles.btnGroup}>
              <button className={styles.prevBtn} onClick={prevStep}>
                ← 上一步
              </button>
              <button className={styles.nextBtn} onClick={nextStep}>
                下一步 →
              </button>
            </div>
          </div>
        )}


      {/* === STEP 5：預覽與送出 === */}
      {step === 5 && (
        <div className={styles.stepBox}>
          <h2>步驟五：預覽並送出申請</h2>
          <p>請確認以下合約內容與個人資料皆正確，確認後可下載 PDF 或直接送出。</p>

          {/* === 借款資訊總覽 === */}
          <div className={styles.previewSection}>
            <h3>申請人資料</h3>
            <table className={styles.previewTable}>
              <tbody>
                <tr>
                  <td>姓名</td>
                  <td>{formData.name || "未填寫"}</td>
                  <td>聯絡電話</td>
                  <td>{formData.phone || "未填寫"}</td>
                </tr>
                <tr>
                  <td>身分證字號</td>
                  <td>{formData.idNumber || "未填寫"}</td>
                  <td>LINE ID</td>
                  <td>{formData.lineId || "未填寫"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* === 合約條款預覽 === */}
          <div className={styles.contractBox}>
            <h3 className={styles.contractBoxTitle}>金錢消費借貸契約</h3>
            <p>一、甲方願將新臺幣壹萬貳仟元整貸與乙方。</p>
            <p>二、還款日期與金額：</p>
            <ul>
              {schedule.payDates.map((date, i) => (
                <li key={i}>
                  第  {i + 1}  期 {date}：新臺幣 {schedule.payAmounts[i].toLocaleString()} 元整
                </li>
              ))}
            </ul>
            <p>
              三、乙方同意創業佳數位科技有限公司（下簡稱「創業佳」）進行必要之徵信調查，
              並支付徵信費用參仟伍佰元整；乙方應於甲方撥款前支付予創業佳，
              或由甲方以前揭借款支付予創業佳。
            </p>
            <p>四、開辦費：伍佰元整。</p>
            <p>五、因違反本契約致甲方受損害，乙方應賠償懲罰性違約金伍萬元整予甲方。</p>
            <p>六、貸款核準最終解釋權歸於本公司，若未成功核貸，本資料將刪除銷毀。</p>
            <p>七、甲乙雙方同意因本契約所衍生之一切訴訟以臺灣桃園地方法院為第一審管轄法院。</p>

            <p>申貸日期：{new Date().toLocaleDateString("zh-TW")}</p>
            <p>首次還款日：{schedule.payDates[0]}</p>
            <p>貸與人：富士旺實業股份有限公司（以下簡稱甲方）</p>
            <p>借用人：（以下簡稱乙方）</p>
          </div>

          {/* === 簽名預覽 === */}
          {formData.signature && (
            <div className={styles.signaturePreview}>
              <h4>簽名預覽：</h4>
              <img src={formData.signature} alt="簽名" className={styles.previewSignature} />
            </div>
          )}

          {/* === 按鈕群 === */}
          <div className={styles.btnGroup}>
            <button
              className={styles.downloadBtn}
              onClick={async () => {
                try {
                  const res = await fetch("http://localhost:8000/api/contract_pdf.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                  });
                  if (!res.ok) throw new Error();
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "合約書.pdf";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  alert("❌ PDF 生成失敗");
                }
              }}
            >
              📄 下載合約 PDF
            </button>

            <button className={styles.prevBtn} onClick={prevStep}>
              ← 上一步
            </button>
            <button className={styles.nextBtn} disabled={loading} onClick={handleSubmit}>
              {loading ? "送出中..." : "確認送出 →"}
            </button>
          </div>
        </div>
      )}

      {/* === STEP 6：完成 === */}
      {step === 6 && (
        <div className={styles.stepBox}>
          <h2>🎉 申請完成</h2>
          <p>感謝您的申請，我們將盡快與您聯繫！</p>
          <p>{countdown} 秒後將自動前往 Line 官方帳號 👉</p>
          <a
            href="https://line.me/R/ti/p/@335lmovr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.lineBtn}
          >
            立即前往 Line@
          </a>
        </div>
      )}
    </div>
  );
}
