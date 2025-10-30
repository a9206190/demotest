import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import styles from "./FAQ.module.css"; 
import lineIcon from "../assets/icons/line.jpg";

const faqs = [
  {
    question: "是否年資一定要滿半年，才能申請信貸？",
    answer: `
多數銀行申辦信貸時，會要求「年資滿半年以上」，但其實——  
✔ 有少數銀行接受滿3個月年資的借款人申請  
✔ 有些會參考前一份工作的年資  
✔ 另有針對五師（如醫師、律師、建築師等）或500大企業員工的特別方案  
✔ 長期使用的信用卡，也可能有卡友貸款的機會  

如果您因年資不足在申請上遇到困難，歡迎免費諮詢我們的專業貸款顧問，我們會幫您找出最適合的方式，不錯過每一個能核貸的機會！
    `,
  },
  {
    question: "信貸需要那些文件?",
    answer: `
基本文件包含：  
✔ 身分證正反面影本  
✔ 第二證件（健保卡、駕照等）  
✔ 薪資轉帳明細或薪資單  
✔ 勞保投保明細  
✔ 其他依銀行要求提供的佐證文件  
`,
  },
  {
    question: "信貸若繳不出來怎麼辦？",
    answer: `
若發生繳款困難，建議立即與銀行聯繫，說明狀況。銀行可能提供：  
✔ 延長還款年限  
✔ 暫時寬限期（只繳利息不還本金）  
✔ 利率重談或整合貸款方案  

若您無法與銀行協商，我們可協助評估「債務整合」或「轉貸」方式，減輕每月負擔。
`,
  },
  {
    question: "有哪些借款方案？",
    answer: `
依需求可選擇：  
✔ 個人信貸  
✔ 房屋增貸或轉貸  
✔ 汽車貸款（可免留車）  
✔ 小額貸款 / 信用卡貸款  
✔ 職業專案貸（公教、軍警、醫師、律師等）  
`,
  },
  {
    question: "申辦借款需要什麼條件？",
    answer: `
一般條件包含：  
✔ 年滿20歲以上  
✔ 有穩定工作或收入來源  
✔ 信用紀錄良好（無重大逾期）  
✔ 具備還款能力  

若有瑕疵紀錄，也可依個案評估是否可由共同借款人或保人協助。
`,
  },
  {
    question: "在銀行的信用有瑕疵也可以辦理借款嗎？",
    answer: `
有機會，但需視狀況而定。若信用不良、遲繳或列入協商戶，仍可能透過：  
✔ 擔保品（如房屋、汽車）  
✔ 第二順位貸款  
✔ 民間貸款或債務整合方案  

我們建議先由顧問協助評估可行性，避免被拒絕紀錄影響未來申貸。
`,
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const toggleFAQ = (index) => setOpenIndex(openIndex === index ? null : index);
  const navigate = useNavigate();

  return (
    <div className={styles.faqPage}>
      <h1 className={styles.faqTitle}>常見問答</h1>
      <p className={styles.faqSubtitle}>解答您關於貸款服務的疑問</p>

      <div className={styles.faqList}>
        {faqs.map((item, index) => (
          <div
            key={index}
            className={`${styles.faqItem} ${
              openIndex === index ? styles.active : ""
            }`}
          >
            <button
              className={styles.faqQuestion}
              onClick={() => toggleFAQ(index)}
            >
              <span>{item.question}</span>
              <span
                className={`${styles.faqIcon} ${
                  openIndex === index ? styles.open : ""
                }`}
              >
                {openIndex === index ? "−" : "+"}
              </span>
            </button>

            <div
              className={styles.faqAnswer}
              style={{
                maxHeight: openIndex === index ? "1000px" : "0px",
                opacity: openIndex === index ? "1" : "0",
              }}
            >
              <p
                dangerouslySetInnerHTML={{
                  __html: item.answer.replace(/\n/g, "<br />"),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ✅ FAQ專用諮詢區塊 */}
      <section className={styles.faqHelpSection}>
        <h2 className={styles.faqhelph2}>還有其他問題嗎？</h2>
        <p className={styles.faqhelptext}>我們的專業團隊隨時為您提供協助</p>

        <div className={styles.faqHelpButtons}>
          <button
            className={`${styles.faqBtn} ${styles.faqPhone}`}
            onClick={() => (window.location.href = "tel:0905626580")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.phoneIcon}
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5 2h3a2 2 0 0 1 2 1.72c.12.83.37 1.64.72 2.4a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6.9 6.9l1.27-1.27a2 2 0 0 1 2.11-.45c.76.35 1.57.6 2.4.72A2 2 0 0 1 22 16.92z"></path>
            </svg>
            電話諮詢
          </button>
          <button
            className={`${styles.faqBtn} ${styles.faqLine}`}
            onClick={() =>
              window.open("https://line.me/R/ti/p/@335lmovr", "_blank")
            }
            >
            <img src={lineIcon} alt="Line Icon" className={styles.lineIcon} />
            Line 諮詢
          </button>


          <button
            className={`${styles.faqBtn} ${styles.faqLoan}`}
            onClick={() => navigate("/loan")}
          >
            💰 線上核貸
          </button>
          <button
            className={`${styles.faqBtn} ${styles.faqConsult}`}
            onClick={() => navigate("/#consult-section")}
          >
            🧑‍💻 線上諮詢
          </button>
        </div>
      </section>
    </div>
  );
}
