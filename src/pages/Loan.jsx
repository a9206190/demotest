import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; 
import styles from "./Loan.module.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { zhTW } from "date-fns/locale";
import API from '@config/apiConfig'

export default function Loan() {
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  // const [countdown, setCountdown] = useState(5);
  const [subStep, setSubStep] = useState(1);
  const location = useLocation(); 

  // === ✅ 自動抓取推薦碼 (ref 或 agent) ===
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get("ref");
    const agentCode = params.get("agent");
    if (refCode) {
      setFormData((prev) => ({ ...prev, referral_code: refCode }));
    } else if (agentCode) {
      setFormData((prev) => ({ ...prev, referral_code: agentCode }));
    }
  }, [location.search]);

  // === 上傳欄位設定 ===
  const uploadFields = [
    { name: "idFront", label: "★身分證正面" },
    { name: "idBack", label: "★身分證背面" },
    { name: "healthCard", label: "★健保快易通截圖" },
    { name: "bankBook", label: "★存摺封面" },
    { name: "selfie", label: "★手持身份證自拍" },
    { name: "secondId", label: "(選填)電信賬單拍照" },
  ];

  // === 初始化：還原 sessionStorage ===
  useEffect(() => {
    const savedStep = sessionStorage.getItem("loan_step");
    const savedAgree = sessionStorage.getItem("loan_agree");
    const savedForm = sessionStorage.getItem("loan_form");
    const savedTime = sessionStorage.getItem("loan_saved_time");

    // ⏱️ 如果超過 10 分鐘，直接清除舊資料
    if (savedTime) {
      const diff = Date.now() - parseInt(savedTime);
      if (diff > 10 * 60 * 1000) {
        sessionStorage.clear();
        return;
      }
    }

    if (savedStep) setStep(parseInt(savedStep));
    if (savedAgree) setAgree(savedAgree === "true");
    if (savedForm) setFormData(JSON.parse(savedForm));
  }, []);

  // === 自動保存 + 更新時間 ===
  useEffect(() => {
  const { idFront: _idFront, idBack: _idBack, healthCard: _healthCard, bankBook: _bankBook, selfie: _selfie, secondId: _secondId, signature: _signature, ...textOnlyForm } = formData;
  sessionStorage.setItem("loan_step", step);
  sessionStorage.setItem("loan_agree", agree);
  sessionStorage.setItem("loan_form", JSON.stringify(textOnlyForm));
  sessionStorage.setItem("loan_saved_time", Date.now().toString());
}, [step, agree, formData]);



  // 🧹 新增：10分鐘後自動清除表單
  useEffect(() => {
    const timeout = setTimeout(() => {
      sessionStorage.clear();
      setFormData({});
      setStep(1);
      setAgree(false);
      alert("⏰ 您已閒置超過 10 分鐘，表單資料已自動清除。");
    }, 10 * 60 * 1000); // 10 分鐘

    return () => clearTimeout(timeout);
  }, []);

  // 🧹 新增：離開頁面（關閉或重新整理）時清除表單
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.clear();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // === Step6：自動跳轉 Line@ ===
  // useEffect(() => {
  //   if (step !== 6) return;
  //   setCountdown(5);
  //   const interval = setInterval(() => {
  //     setCountdown((prev) => {
  //       if (prev <= 1) {
  //         clearInterval(interval);
  //         window.location.href = "https://line.me/R/ti/p/@335lmovr";
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, [step]);

  // === 下一步 / 上一步 ===
  const nextStep = () => {
    if (step === 1 && !agree) {
      alert("⚠️ 請勾選『本人已閱讀並同意提供個人資料』後再繼續。");
      return;
    }
    if (step === 3) {
      // 計算已上傳的照片數量
      const uploadedCount = uploadFields.filter((f) => formData[f.name]).length;
      if (uploadedCount < 5) {
        alert(`⚠️ 請至少上傳 5 張證件照片（目前 ${uploadedCount} 張）。`);
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

  // ✅ 圖片壓縮上傳（最終整合版，支援 30MB 限制 + 自動壓縮）
  const handleCompressedFileChange = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert("⚠️ 檔案太大，請選擇小於 30MB 的圖片。");
      return;
    }

    setFormData((p) => ({ ...p, uploading: true }));

    try {
      const compressedFile = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const MAX_WIDTH = 1280;
            const scale = Math.min(1, MAX_WIDTH / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject("Blob 生成失敗");
                const compressed = new File([blob], `${fieldName}.jpg`, {
                  type: "image/jpeg",
                });
                console.log(`📦 ${fieldName} 壓縮後：${(blob.size / 1024).toFixed(1)} KB`);
                resolve(compressed);
              },
              "image/jpeg",
              0.85 // 壓縮品質
            );
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setFormData((prev) => ({
        ...prev,
        [fieldName]: compressedFile, // ⬅️ 存 File，不存 base64
        uploading: false,
      }));
    } catch (err) {
      console.error("❌ 圖片壓縮失敗：", err);
      alert("圖片壓縮時發生錯誤，請重新嘗試上傳。");
      setFormData((p) => ({ ...p, uploading: false }));
    }
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
    "個資提供同意書",
    "填寫個人申請資訊",
    "上傳證件",
    "借貸合約簽名",
    "預覽合約",
    "完成",
  ];

  // === 送出申請 ===
  console.log("🚀 SUBMIT_LOAN URL =", API.SUBMIT_LOAN);
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // 文字欄位
      Object.entries(formData).forEach(([key, value]) => {
        if (
          ![
            "idFront", "idBack", "healthCard",
            "bankBook", "selfie", "secondId",
            "signature", "showSignModal", "uploading",
          ].includes(key)
        ) {
          formDataToSend.append(key, value ?? "");
        }
      });

      // === 檔案欄位對應表（前端名稱 → 後端欄位名稱 file_type）
      const fileMap = {
        idFront: "id_front",
        idBack: "id_back",
        healthCard: "nhic_quick",
        bankBook: "bankbook",
        selfie: "selfie",
        secondId: "second_id",
        signature: "signature",
      };

      // === 處理所有圖片欄位 ===
      for (const [key, type] of Object.entries(fileMap)) {
        const val = formData[key];

        // ✅ 若為 File（壓縮後或簽名轉檔）
        if (val instanceof File) {
          console.log(`📁 ${key} 是 File:`, val.name, val.size);
          formDataToSend.append(type, val);
          continue;
        }

        // ✅ 若為 blob URL
        if (val && typeof val === "string" && val.startsWith("blob:")) {
          console.log(`📁 ${key} 是 blob URL，開始 fetch`);
          const blob = await fetch(val).then((r) => r.blob());
          formDataToSend.append(type, new File([blob], `${type}.jpg`, { type: "image/jpeg" }));
          continue;
        }

        // ❌ 其他狀況
        console.warn(`⚠️ ${key} 不是有效圖片欄位：`, val);
      }


      // 🔍 Debug log
      for (let [k, v] of formDataToSend.entries()) {
        console.log(
          "📦 FormData 送出：",
          k,
          v instanceof File ? `[File] ${v.name} (${v.type}, ${v.size} bytes)` : v
        );
      }

      const res = await fetch(API.SUBMIT_LOAN, {
        method: "POST",
        body: formDataToSend,
        credentials: "include",
      });

      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("伺服器回傳格式錯誤：" + text.slice(0, 200));
      }

      if (res.ok && result.success) {
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
      <div className={styles.stepBarWrapper}>
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
            <span>本人已閱讀並同意提供個人資料供核貸審查使用。</span>
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

          {/* === 子階段 1：個人資料 === */}
          {subStep === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubStep(2);
              }}
              className={styles.formGrid}
            >
              <h3>個人資料</h3>

              <label>★ 姓名</label>
              <input
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                required
              />

              <label>★ 聯絡電話</label>
              <input
                name="phone"
                value={formData.phone || ""}
                onChange={handleInputChange}
                required
              />

              <label>★ 身分證字號</label>
              <input
                name="idNumber"
                value={formData.idNumber || ""}
                onChange={handleInputChange}
                required
              />

              <label>LINE ID（選填）</label>
              <input
                name="lineId"
                value={formData.lineId || ""}
                onChange={handleInputChange}
                placeholder="若無可留空"
              />
              <div className={styles.inputYear}>
                <label>★ 出生年月日</label>
                <DatePicker
                  selected={formData.birthDate ? new Date(formData.birthDate) : null}
                  onChange={(d) =>
                    setFormData((p) => ({
                      ...p,
                      birthDate: d ? d.toISOString().split("T")[0] : "",
                    }))
                  }
                  dateFormat="yyyy-MM-dd"
                  locale={zhTW}
                  className={styles.customDatePicker}
                  showMonthDropdown       
                  showYearDropdown       
                  dropdownMode="select"   
                  yearDropdownItemNumber={100} 
                  scrollableYearDropdown   
                  required
                />
              </div>

              <div className={styles.btnGroup}>
                <button type="button" className={styles.prevBtn} onClick={prevStep}>
                  ← 上一步
                </button>
                <button type="submit" className={styles.nextBtn}>
                  下一頁 →
                </button>
              </div>
            </form>
          )}

          {/* === 子階段 2：公司與居住資料 === */}
          {subStep === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubStep(3);
              }}
              className={styles.formGrid}
            >
              <h3>公司與居住資料</h3>

              <label>公司名稱</label>
              <input
                name="companyName"
                value={formData.companyName || ""}
                onChange={handleInputChange}
              />

              <label>公司地址</label>
              <input
                name="companyAddress"
                value={formData.companyAddress || ""}
                onChange={handleInputChange}
              />

              <label>公司電話</label>
              <input
                name="companyPhone"
                value={formData.companyPhone || ""}
                onChange={handleInputChange}
              />

              <label>職稱</label>
              <input
                name="jobTitle"
                value={formData.jobTitle || ""}
                onChange={handleInputChange}
              />

              <label>月薪</label>
              <input
                name="salary"
                value={formData.salary || ""}
                onChange={handleInputChange}
              />

              <label>工作年資</label>
              <input
                name="workYears"
                value={formData.workYears || ""}
                onChange={handleInputChange}
              />

              <label>★ 戶籍地址</label>
              <input
                name="address"
                value={formData.address || ""}
                onChange={handleInputChange}
                required
              />

              <label>戶籍持有人</label>
              <select
                name="holderHome"
                value={formData.holderHome || ""}
                onChange={handleInputChange}
                className={styles.selectField}
              >
                <option value="">請選擇</option>
                <option value="自有">自有</option>
                <option value="親戚">親戚</option>
                <option value="租屋">租屋</option>
                <option value="家人">家人</option>
                <option value="家人">其他</option>
              </select>

              <label>居住地持有人</label>
              <select
                name="holderResidence"
                value={formData.holderResidence || ""}
                onChange={handleInputChange}
                className={styles.selectField}
              >
                <option value="">請選擇</option>
                <option value="自有">自有</option>
                <option value="親戚">親戚</option>
                <option value="租屋">租屋</option>
                <option value="家人">家人</option>
                <option value="家人">其他</option>
              </select>

              <label>居住地區</label>
              <select
                name="residentArea"
                value={formData.residentArea || ""}
                onChange={handleInputChange}
                className={styles.selectField}
                required
              >
                <option value="">請選擇地區</option>
                <option value="基隆市">基隆市</option>
                <option value="台北市">台北市</option>
                <option value="新北市">新北市</option>
                <option value="桃園市">桃園市</option>
                <option value="新竹市">新竹市</option>
                <option value="新竹縣">新竹縣</option>
                <option value="苗栗縣">苗栗縣</option>
                <option value="台中市">台中市</option>
                <option value="彰化縣">彰化縣</option>
                <option value="南投縣">南投縣</option>
                <option value="雲林縣">雲林縣</option>
                <option value="嘉義市">嘉義市</option>
                <option value="嘉義縣">嘉義縣</option>
                <option value="台南市">台南市</option>
                <option value="高雄市">高雄市</option>
                <option value="屏東縣">屏東縣</option>
                <option value="宜蘭縣">宜蘭縣</option>
                <option value="花蓮縣">花蓮縣</option>
                <option value="台東縣">台東縣</option>
                <option value="澎湖縣">澎湖縣</option>
                <option value="金門縣">金門縣</option>
                <option value="連江縣">連江縣</option>
              </select>

              <label>詳細地址</label>
              <input
                name="residentAddress"
                placeholder="例如：中壢區中正路123號5樓"
                value={formData.residentAddress || ""}
                onChange={handleInputChange}
                required
              />

              <div className={styles.btnGroup}>
                <button
                  type="button"
                  className={styles.prevBtn}
                  onClick={() => setSubStep(1)}
                >
                  ← 上一頁
                </button>
                <button type="submit" className={styles.nextBtn}>
                  下一頁 →
                </button>
              </div>
            </form>
          )}

          {/* === 子階段 3：信用狀況與聯絡人 === */}
          {subStep === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                nextStep();
              }}
              className={styles.formGrid}
            >
              <h3>信用狀況與聯絡人</h3>

              <div className={styles.sixColRow}>
                {[
                  { name: "laborInsurance", label: "★ 有無勞保" },
                  { name: "hasBankLoan", label: "★ 有無銀行貸款" },
                  { name: "hasFinanceLoan", label: "★ 有無融資貸款" },
                  { name: "hasPersonalLoan", label: "★ 有無民間貸款" },
                  { name: "creditStatus", label: "★ 銀行信用狀況" },
                  { name: "hasCreditCard", label: "★ 有無信用卡" },
                ].map((f) => (
                  <div key={f.name}>
                    <label>{f.label}</label>
                    <select
                      name={f.name}
                      value={formData[f.name] || ""}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">請選擇</option>
                      {f.name === "creditStatus" ? (
                        <>
                          <option value="正常">正常</option>
                          <option value="呆賬">呆賬</option>
                          <option value="警示戶">警示戶</option>
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

              <div className={styles.contactRow}>
                {/* 聯絡人一 */}
                <div className={styles.contactGroup}>
                  <label>聯絡人一姓名</label>
                  <label>關係</label>
                  <input name="contact1Name" value={formData.contact1Name || ""} onChange={handleInputChange} />
                  <input name="contact1Relation" value={formData.contact1Relation || ""} onChange={handleInputChange} />
                  <label style={{ gridColumn: "span 2" }}>聯絡人電話</label>
                  <input
                    name="contact1Phone"
                    value={formData.contact1Phone || ""}
                    onChange={handleInputChange}
                    style={{ gridColumn: "span 2" }}
                  />
                </div>

                {/* 聯絡人二 */}
                <div className={styles.contactGroup}>
                  <label>聯絡人二姓名</label>
                  <label>關係</label>
                  <input name="contact2Name" value={formData.contact2Name || ""} onChange={handleInputChange} />
                  <input name="contact2Relation" value={formData.contact2Relation || ""} onChange={handleInputChange} />
                  <label style={{ gridColumn: "span 2" }}>聯絡人電話</label>
                  <input
                    name="contact2Phone"
                    value={formData.contact2Phone || ""}
                    onChange={handleInputChange}
                    style={{ gridColumn: "span 2" }}
                  />
                </div>
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
                <button
                  type="button"
                  className={styles.prevBtn}
                  onClick={() => setSubStep(2)}
                >
                  ← 上一頁
                </button>
                <button type="submit" className={styles.nextBtn}>
                  下一步 →
                </button>
              </div>
            </form>
          )}
        </div>
      )}



      {/* === STEP 3：上傳證件 === */}
      {step === 3 && (
        <div className={styles.stepBox}>
          <h2>步驟三：上傳證件</h2>
          <p className={styles.stepHint}>
            請依指示上傳相關文件（<span className={styles.required}>★ 必填</span> 為必要項目）
          </p>

          <div className={styles.uploadGrid}>
            {uploadFields.map((f) => {
              const isRequired = f.label.includes("★"); // ★表示必填
              const fileData = formData[f.name];
              const previewUrl =
                fileData instanceof File
                  ? URL.createObjectURL(fileData)
                  : typeof fileData === "string"
                  ? fileData
                  : null;

              return (
                <div key={f.name} className={styles.uploadCard}>
                  <label className={styles.uploadLabel}>
                    {f.label}
                    {isRequired && <span className={styles.requiredMark}>★</span>}
                  </label>

                  {previewUrl ? (
                    <div className={styles.previewBox}>
                      <img
                        src={previewUrl}
                        alt={f.label}
                        className={styles.previewImage}
                        onLoad={(e) => {
                          // ✅ 自動釋放 URL，避免記憶體累積
                          if (fileData instanceof File) {
                            URL.revokeObjectURL(e.target.src);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => {
                          setFormData((p) => ({ ...p, [f.name]: "" }));
                        }}
                        title="移除圖片"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className={styles.uploadPlaceholder}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCompressedFileChange(e, f.name)}
                        required={isRequired}
                      />
                      <span>📷 點此上傳</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>


          <div className={styles.btnGroup}>
            <button type="button" className={styles.prevBtn} onClick={prevStep}>
              ← 上一步
            </button>
            <button
              type="button"
              className={styles.nextBtn}
              onClick={() => {
                const missingRequired = uploadFields
                  .filter((f) => f.label.includes("★"))
                  .some((f) => !formData[f.name]);
                if (missingRequired) {
                  alert("⚠️ 請上傳所有必填文件再繼續！");
                  return;
                }
                nextStep();
              }}
            >
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

            {/* ✅ 簽名區塊 */}
            {!formData.signature && (
              <button
                type="button"
                className={styles.startSignBtn}
                onClick={() => setFormData((p) => ({ ...p, showSignModal: true }))}
              >
                ✍️ 借款人簽名
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

                        // ✅ 轉成 Blob → File
                        tempCanvas.toBlob(
                          (blob) => {
                            if (!blob) {
                              alert("簽名轉換失敗，請重新簽名");
                              return;
                            }
                            const signFile = new File([blob], "signature.png", { type: "image/png" });

                            // 存入 formData.signature 作為 File 類型
                            setFormData((p) => ({
                              ...p,
                              signature: signFile,
                              showSignModal: false,
                            }));

                            console.log("✅ 簽名已轉成 File:", signFile);
                          },
                          "image/png",
                          1.0
                        );
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
              <img
                src={formData.signature instanceof File
                  ? URL.createObjectURL(formData.signature)
                  : formData.signature}
                alt="簽名"
                onLoad={(e) => {
                  if (formData.signature instanceof File) {
                    URL.revokeObjectURL(e.target.src); // 釋放暫存URL
                  }
                }}
              />
              <button
                className={styles.clearBtn}
                onClick={() => setFormData((p) => ({ ...p, signature: "" }))}
              >
                重新簽名
              </button>
            </div>
          )}


          {/* === 按鈕群 === */}
          <div className={styles.btnGroup}>
            <button
              className={styles.downloadBtn}
              onClick={async () => {
                try {
                  // ✅ 自動判斷目前環境
                  const isLocal =
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1";
                  const pathPrefix = window.location.pathname.includes("/demo") ? "/demo" : "";
                  const API_BASE = isLocal
                    ? "http://localhost:8000"
                    : `${window.location.origin}${pathPrefix}`;

                  const res = await fetch(`${API_BASE}/api/contract_pdf.php`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                  });

                  if (!res.ok) throw new Error(`伺服器回應狀態 ${res.status}`);

                  // ✅ 處理 PDF blob 並觸發下載
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `合約書_${formData.name || "客戶"}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("PDF 生成失敗：", err);
                  alert("❌ PDF 生成失敗，請稍後再試");
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
          {/* <p>{countdown} 秒後將自動前往 Line 官方帳號 👉</p> */}
          {/* <a
            href="https://line.me/R/ti/p/@335lmovr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.lineBtn}
          >
            立即前往 Line@
          </a> */}
        </div>
      )}
    </div>
  );
}
