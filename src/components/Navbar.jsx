// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import logo from "../assets/images/logo.png-115x96.png";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* 左側 Logo */}
        <div className="navbar-logo">
          <img src={logo} alt="閃電貸行銷公司 Logo" className="logo-image" />
          <Link to="/" onClick={closeMenu}>
            <span className="logo-text">閃電貸行銷公司</span>
          </Link>
        </div>

        {/* ☰ 手機版按鈕 */}
        <div className="menu-toggle" onClick={toggleMenu}>
          {menuOpen ? (
            <span className="close-icon">&times;</span> // 關閉 ✕
          ) : (
            <>
              <div className="bar"></div>
              <div className="bar"></div>
              <div className="bar"></div>
            </>
          )}
        </div>

        {/* 桌機導覽列（保持原狀） */}
        <ul className="navbar-links">
          <li><Link to="/FAQ">常問問題</Link></li>
          <li><Link to="/about">關於我們</Link></li>
          <li><Link to="/service">顧客服務</Link></li>
          <li><Link to="/contact">聯絡我們</Link></li>
          <li><Link to="/loan">線上核貸</Link></li>
        </ul>

        {/* 手機滿版下拉選單 */}
        <div className={`mobile-dropdown ${menuOpen ? "active" : ""}`}>
          <ul>
            <li><Link to="/FAQ" onClick={closeMenu}>常問問題</Link></li>
            <li><Link to="/about" onClick={closeMenu}>關於我們</Link></li>
            <li><Link to="/service" onClick={closeMenu}>顧客服務</Link></li>
            <li><Link to="/contact" onClick={closeMenu}>聯絡我們</Link></li>
            <li><Link to="/loan" onClick={closeMenu}>線上核貸</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
