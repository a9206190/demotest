import React from "react";
import lineIcon from "../assets/icons/line.jpg";
import { FaCheckCircle } from "react-icons/fa";
import styles from "./About.module.css";

export default function About() {
  return (
    <div className={styles.aboutContainer}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>關於我們</h1>
        <p className={styles.heroSubtitle}>我們是專業的貸款服務提供者</p>
      </section>

      {/* 公司簡介 */}
      <section className={styles.section}>
        <h2>關於我們</h2>
        <p>
          閃電貸公司秉持「專業、誠信、便利」的服務精神，致力於為客戶提供合法、安全且彈性的貸款方案。
          無論您需要小額資金周轉、個人信貸，或是房貸整合，我們都有專業的顧問團隊，依您的需求量身規劃，協助您快速獲得資金支持。
        </p>
        <p>
          我們深知每一位客戶的情況都不相同，因此提供多元化的金融解決方案，並堅持透明化流程與合理利率，讓您在資金規劃上無後顧之憂。
        </p>
        <p>
          選擇閃電貸公司，就是選擇安心與效率。我們不僅是您資金上的後盾，更是實現夢想的最佳夥伴。
        </p>
      </section>

      {/* 我們的使命 */}
      <section className={styles.missionBlock}>
        <h2 className={styles.missionBlockTitle}>我們的使命</h2>
        <p>
          我們致力於以透明、快速、友善的流程，協助有資金需求的您取得合適的貸款方案。
          從資格評估、文件準備、到核貸進度追蹤，皆由專人一對一服務，減少溝通成本，讓每一步更省心。
        </p>
      </section>

      {/* 我們能為你做什麼 */}
      <section className={styles.featuresSection}>
        <h2>我們能為你做什麼</h2>
        <div className={styles.featuresGrid}>
          {[
            {
              title: "客製化貸款規劃",
              desc: "依您的職業、年資、負債與信用狀況，匹配最適合的方案。",
            },
            {
              title: "透明費用與利率",
              desc: "清楚告知每一項成本與利率區間，堅持不隱藏、不話術。",
            },
            {
              title: "快速文件健檢",
              desc: "協助準備薪轉、扣繳、投保等文件，提高核貸成功率。",
            },
            {
              title: "債務整合與重整",
              desc: "整合多筆卡費或貸款，降低月付金，重整財務壓力。",
            },
          ].map((item, i) => (
            <div key={i} className={styles.featureCard}>
              <FaCheckCircle className={styles.checkIcon} />
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 成效數據 */}
      <section className={styles.statsSection}>
        {[
          { num: "5 分鐘", text: "最快完成申請" },
          { num: "1 對 1", text: "專人顧問服務" },
          { num: "高核准", text: "多元方案配對" },
          { num: "低負擔", text: "彈性還款規劃" },
        ].map((item, i) => (
          <div key={i} className={styles.statCard}>
            <p className={styles.statNumber}>{item.num}</p>
            <p>{item.text}</p>
          </div>
        ))}
      </section>
      {/* ✅ About 專用諮詢區塊 */}
        <section className={styles.aboutHelpSection}>
        <h2 className={styles.aboutHelpTitle}>還有其他問題嗎？</h2>
        <p className={styles.aboutHelpText}>我們的專業顧問團隊隨時為您服務</p>

        <div className={styles.aboutHelpButtons}>
            {/* 電話諮詢 */}
            <button
            className={`${styles.aboutBtn} ${styles.aboutPhone}`}
            onClick={() => (window.location.href = "tel:0905626580")}
            >
            📞電話諮詢
            </button>

            {/* LINE 諮詢 */}
            <button
            className={`${styles.aboutBtn} ${styles.aboutLine}`}
            onClick={() =>
                window.open("https://line.me/R/ti/p/@335lmovr", "_blank")
            }
            >
            <img
                src={lineIcon}
                alt="Line Icon"
                className={styles.aboutHelpIcon}
            />
            LINE 諮詢
            </button>

            {/* 線上核貸 */}
            <button
            className={`${styles.aboutBtn} ${styles.aboutLoan}`}
            onClick={() => (window.location.href = "/loan")}
            >
            💰 線上核貸
            </button>

            {/* 線上諮詢 */}
            <button
            className={`${styles.aboutBtn} ${styles.aboutConsult}`}
            onClick={() => (window.location.href = "/consult")}
            >
            🧑‍💻 線上諮詢
            </button>
        </div>
        </section>


    </div>
  );
}
