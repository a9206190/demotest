import React from "react";
import styles from "./Service.module.css";

// 匯入圖片
import img1 from "../assets/images/81709885-m.jpg-816x544.jpg";
import img2 from "../assets/images/95449699-m.jpg-816x542.jpg";
import img3 from "../assets/images/39917134-m.jpg-816x544.jpg";
import img4 from "../assets/images/127571652-m-1.jpg-2508x1672.jpg";
import img5 from "../assets/images/35001455-m.jpg-2501x1677.jpg";
import img6 from "../assets/images/99364031-m.jpg-2508x1672.jpg";
import lineIcon from "../assets/icons/line.jpg"; 
import phoneIcon from "../assets/icons/phone.jpg";

export default function Service() {
  const painPoints = [
    {
      title: "每個月都是月光族",
      desc: "夢想只能暫時擱置",
      img: img1,
    },
    {
      title: "只繳最低應繳卡費",
      desc: "永遠追不上還款速度",
      img: img2,
    },
    {
      title: "銀行往來紀錄很清白",
      desc: "申請貸款總被打回票",
      img: img3,
    },
    {
      title: "想貸最高額度",
      desc: "卻不知該從哪裡開始",
      img: img4,
    },
    {
      title: "好不容易貸到一筆款",
      desc: "還是有資金需求無法解決",
      img: img5,
    },
    {
      title: "想整合負債重新規劃財務",
      desc: "還希望能額外再多貸一筆資金",
      img: img6,
    },
  ];

  return (
    <div className={styles.serviceContainer}>
      {/* Hero 區 */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>顧客服務</h1>
        <p className={styles.heroSubtitle}>了解您的需求，提供最貼心的貸款協助</p>
      </section>

      {/* 服務卡片區 */}
      <section className={styles.painSection}>
        <div className={styles.painGrid}>
          {painPoints.map((item, index) => (
            <div key={index} className={styles.painCard}>
              <img src={item.img} alt={item.title} className={styles.painImage} />
              <div className={styles.painText}>
                <h3 className={styles.painTitle}>{item.title}</h3>
                <p className={styles.painDesc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* ✅ Service 專用諮詢區塊 */}
      <section className={styles.serviceHelpSection}>
        <h2 className={styles.serviceHelpTitle}>還有其他問題嗎？</h2>
        <p className={styles.serviceHelpText}>我們的專業顧問團隊隨時為您服務</p>

        <div className={styles.serviceHelpButtons}>
          {/* 電話諮詢 */}
          <button
            className={`${styles.serviceBtn} ${styles.servicePhone}`}
            onClick={() => (window.location.href = "tel:0905626580")}
          >
            <img
              src={phoneIcon}
              alt="電話 Icon"
              className={styles.serviceHelpIcon}
            />
             電話諮詢
          </button>

          {/* LINE 諮詢 */}
          <button
            className={`${styles.serviceBtn} ${styles.serviceLine}`}
            onClick={() =>
              window.open("https://line.me/R/ti/p/@335lmovr", "_blank")
            }
          >
            <img
              src={lineIcon}
              alt="Line Icon"
              className={styles.serviceHelpIcon}
            />
            LINE 諮詢
          </button>

          {/* 線上核貸 */}
          <button
            className={`${styles.serviceBtn} ${styles.serviceLoan}`}
            onClick={() => (window.location.href = "/loan")}
          >
            💰 線上核貸
          </button>

          {/* 線上諮詢 */}
          <button
            className={`${styles.serviceBtn} ${styles.serviceConsult}`}
            onClick={() => (window.location.href = "/consult")}
          >
            🧑‍💻 線上諮詢
          </button>
        </div>
      </section>
    </div>
  );
}
