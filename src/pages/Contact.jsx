import React from "react";
import styles from "./Contact.module.css";
import { FaEnvelope, FaPhoneAlt, FaLine } from "react-icons/fa";
import { MdAccessTime, MdLocationOn, MdBusiness, MdPrint } from "react-icons/md";
import lineIcon from "../assets/icons/line.jpg"; // ✅ LINE 圖示

export default function Contract() {
  return (
    <div className={styles.contractContainer}>
      {/* 頁首 */}
      <section className={styles.headerSection}>
        <h1>聯絡我們</h1>
        <p>電話預約・聯絡我們</p>
      </section>

      {/* 主內容：左資訊 + 右地圖 */}
      <section className={styles.contentSection}>
        {/* 左：公司資訊 */}
        <div className={styles.infoBlock}>
          <h2 className={styles.sectionTitle}>聯絡資訊</h2>

          {/* 三顆水平按鈕 */}
          <div className={styles.buttonRow}>
            <a href="tel:0905626580" className={`${styles.btn} ${styles.callBtn}`}>
              <FaPhoneAlt /> 立即來電
            </a>

            <a
              href="mailto:he45324@gmail.com?subject=貸款諮詢&body=您好，我想詢問貸款方案。"
              className={`${styles.btn} ${styles.mailBtn}`}
            >
              <FaEnvelope /> 免費 Email 諮詢
            </a>

            <a
              href="https://line.me/R/ti/p/@335lmovr"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.btn} ${styles.lineBtn}`}
            >
              <FaLine /> 免費 LINE 諮詢
            </a>
          </div>

          {/* 公司資訊兩欄 */}
          <div className={styles.infoGrid}>
            {/* 左欄 */}
            <div className={styles.infoColumn}>
              <p><MdAccessTime /> <strong>服務時間</strong></p>
              <p>週一至週五 09:00 - 18:00</p>

              <p><MdBusiness /> <strong>公司名稱</strong></p>
              <p>閃電貸行銷公司</p>

              <p><FaLine /> <strong>LINE ID</strong></p>
              <p>em16888ma</p>

              <p><MdLocationOn /> <strong>地址</strong></p>
              <p>桃園市桃園區國際路一段89號二樓</p>
            </div>

            {/* 右欄 */}
            <div className={styles.infoColumn}>
              <p><FaEnvelope /> <strong>E-mail</strong></p>
              <p>he45324@gmail.com</p>

              <p><MdPrint /> <strong>傳真</strong></p>
              <p>02-12345678</p>
            </div>
          </div>
        </div>

        {/* 右：地圖 */}
        <div className={styles.mapBlock}>
          <iframe
            title="閃電貸行銷公司位置"
            src="https://www.google.com/maps?q=桃園市桃園區國際路一段89號二樓&output=embed"
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </section>

      {/* ✅ Contact 專用諮詢區塊 */}
      <section className={styles.contactHelpSection}>
        <h2 className={styles.contactHelpTitle}>還有其他問題嗎？</h2>
        <p className={styles.contactHelpText}>我們的專業顧問團隊隨時為您服務</p>

        <div className={styles.contactHelpButtons}>
          {/* 電話諮詢 */}
          <button
            className={`${styles.contactBtn} ${styles.contactPhone}`}
            onClick={() => (window.location.href = "tel:0905626580")}
          >
            📞 電話諮詢
          </button>

          {/* LINE 諮詢 */}
          <button
            className={`${styles.contactBtn} ${styles.contactLine}`}
            onClick={() =>
              window.open("https://line.me/R/ti/p/@335lmovr", "_blank")
            }
          >
            <img
              src={lineIcon}
              alt="Line Icon"
              className={styles.contactHelpIcon}
            />
            LINE 諮詢
          </button>

          {/* 線上核貸 */}
          <button
            className={`${styles.contactBtn} ${styles.contactLoan}`}
            onClick={() => (window.location.href = "/loan")}
          >
            💰 線上核貸
          </button>

          {/* 線上諮詢 */}
          <button
            className={`${styles.contactBtn} ${styles.contactConsult}`}
            onClick={() => (window.location.href = "/consult")}
          >
            🧑‍💻 線上諮詢
          </button>
        </div>
      </section>
    </div>
  );
}
