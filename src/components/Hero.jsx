import React, { useState } from "react";
import banner from "../assets/images/banner/banner_1751447533.jpg";
import "./Hero.css";
import lineIcon from "../assets/icons/line.jpg";
import phoneIcon from "../assets/icons/phone.jpg";

export default function Hero() {
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(false);

  // ✅ 直接指定本地 API 路徑（避免 process.env 錯誤）
  const API_BASE = "http://localhost:8000/api/";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("⚠️ 請輸入完整資料！");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}consult_submit.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ 表單已送出，我們將盡快與您聯繫！");
        setFormData({ name: "", phone: "" });
      } else {
        alert("❌ 送出失敗：" + (result.message || "請稍後再試"));
      }
    } catch (error) {
      console.error("❌ 錯誤：", error);
      alert("⚠️ 系統錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const videos = [
    { id: "MDa411wAWJk" },
    { id: "vumF1oZx-Rg" },
    { id: "zRI8v6JsCxc" },
    { id: "mjyjYFdv6KM" },
  ];

  return (
    <div className="hero-container">
      {/* ✅ Banner 區塊 */}
      <a href="/Loan"><section
        className="hero-banner"
        style={{ backgroundImage: `url(${banner})` }}
      ></section></a>

      {/* ✅ 免費諮詢表單 */}
      <section className="hero-form-section">
        <h2 className="consult-title">立即免費諮詢</h2>
        <form onSubmit={handleSubmit} className="consult-form">
          <div className="form-group">
            <input
              type="text"
              name="name"
              placeholder="輸入姓名"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="tel"
              name="phone"
              placeholder="輸入手機"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "⌛ 送出中..." : "✅ 確認送出"}
          </button>
        </form>
      </section>

      {/* ✅ YouTube 區塊 */}
      <section className="hero-video-section">
        <h2 className="video-title">精彩影片推薦</h2>
        <div className="video-grid">
          {videos.map((video, index) => (
            <a
              key={index}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card"
            >
              <img
                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                alt={`影片封面 ${index + 1}`}
              />
              <div className="play-overlay">▶</div>
            </a>
          ))}
        </div>
      </section>

      {/* ✅ 協助諮詢區塊 */}
      <section className="hero-help-section">
        <h2>還有其他問題嗎？</h2>
        <p>我們的專業團隊隨時為您提供協助</p>

        <div className="help-buttons">
          <div className="help-row">
            <button className="help-btn phone">📞 電話諮詢</button>
            <button className="help-btn line">💬 Line 諮詢</button>
            <button className="help-btn loan">💰 線上核貸</button>
          </div>
          <div className="help-row">
            <button className="help-btn consult">🧑‍💻 線上諮詢</button>
          </div>
        </div>
      </section>

      {/* ✅ 懸浮聯絡按鈕 */}
      <div className="floating-buttons">
        <a href="tel:0905626580" className="floating-btn phone">
          <img src={phoneIcon} alt="電話聯絡" />
        </a>
        <a
          href="https://line.me/R/ti/p/@335lmovr"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-btn line"
        >
          <img src={lineIcon} alt="Line 聯絡" />
        </a>
      </div>
    </div>
  );
}
