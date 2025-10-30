import { Routes, Route, useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Service from "./pages/Service";
import Contact from "./pages/Contact";
import Loan from "./pages/Loan";
import Login from "./admin/Login";

import ProtectedRoute from "./admin/components/ProtectedRoute";
import AdminDashboard from "./admin/dashboard/Admin_Dashboard";
import BusinessDashboard from "./admin/dashboard/Business_Dashboard";
import AgentDashboard from "./admin/dashboard/Agent_Dashboard";
import Admin_System from "./admin/pages/Admin_System";
import AMedia from "./admin/pages/Media";
import AContact from "./admin/pages/Contact";
import ALoan from "./admin/pages/Loan";
import AOverview from "./admin/pages/Overview";

import footerLogo from "./assets/images/SDLOGO.png";
import "./App.css";

export default function App() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  // ✅ 只在「前台頁面」切換時滾回頂部
  useEffect(() => {
    if (!isAdminPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname, isAdminPage]);

  return (
    <>
      {!isAdminPage && <Navbar />}

      <main>
        <Routes>
          {/* ========= 前台頁面 ========= */}
          <Route path="/" element={<Hero />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/service" element={<Service />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/loan" element={<Loan />} />

          {/* ========= 後台登入頁 ========= */}
          <Route path="/admin/login" element={<Login />} />

          {/* ========= 後台受保護頁面 ========= */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin"]}>
                <Admin_System />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/media"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin"]}>
                <AMedia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/contact"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin", "BAdmin"]}>
                <AContact />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/loan"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin"]}>
                <ALoan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/overview"
            element={
              <ProtectedRoute roles={["Admin", "SAdmin"]}>
                <AOverview />
              </ProtectedRoute>
            }
          />
          {/* ========= 業務 / 代理專屬儀表板 ========= */}
          <Route
            path="/admin/business"
            element={
              <ProtectedRoute roles={["BAdmin"]}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/agent"
            element={
              <ProtectedRoute roles={["GAdmin"]}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </main>

      {!isAdminPage && (
        <footer className="footer">
          <div className="footer-container">
            <div className="footer-left">
              <div className="footer-logo">
                <img src={footerLogo} alt="閃電貸 Logo" />
                <h3>閃電貸行銷公司</h3>
              </div>
              <p>
                閃電貸公司提供多元貸款服務，包含小額貸款、信貸、房貸整合，
                合法安心，審核快速，利率透明，幫助您即時解決資金需求。
              </p>
            </div>

            <div className="footer-middle">
              <h4>聯絡我們</h4>
              <p>Phone：0905-626-580</p>
              <p>E-mail：he45324@gmail.com</p>
            </div>

            <div className="footer-right">
              <h4>快速選單</h4>
              <ul>
                <li><Link to="/">首頁</Link></li>
                <li><Link to="/about">關於我們</Link></li>
                <li><Link to="/service">顧客服務</Link></li>
                <li><Link to="/faq">常見問答</Link></li>
                <li><Link to="/contact">聯絡我們</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            © {new Date().getFullYear()} 閃電貸行銷公司 — All Rights Reserved.
          </div>
        </footer>
      )}
    </>
  );
}
