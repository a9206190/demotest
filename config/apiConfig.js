// =======================================================
// apiConfig.js — 統一管理所有後端 API 路徑（正式站最終版）
// =======================================================

// 🔍 自動偵測環境
const hostname = window.location.hostname;
let origin = window.location.origin;

// 🔧 判斷是否為本地開發環境
const isLocal =
  hostname === "localhost" || hostname === "127.0.0.1";

if (!isLocal) {
  origin = "https://www.moneyfast.cc";
}
// 🧩 API 根路徑（自動去除多餘 /）
const API_BASE = isLocal
  ? "http://localhost:8000/api/admin"
  : `${origin.replace(/\/$/, "")}/api/admin`;

const API_FRONT_BASE = isLocal
  ? "http://localhost:8000/api"
  : `${origin.replace(/\/$/, "")}/api`;

// =======================================================
// 📦 集中定義所有後端 API
// =======================================================
const API = {
  // 🔑 登入與 Session
  LOGIN: `${API_BASE}/login.php`,
  LOGOUT: `${API_BASE}/logout.php`,
  CHECK_SESSION: `${API_BASE}/check_session.php`,

  // 👥 帳號管理
  CREATE_ACCOUNT: `${API_BASE}/create_account.php`,
  DELETE_ACCOUNT: `${API_BASE}/delete_account.php`,
  UPDATE_ACCOUNT: `${API_BASE}/update_account.php`,
  GET_ADMIN_LIST: `${API_BASE}/get_admin_list.php`,
  GET_ADMIN_STATUS: `${API_BASE}/get_admin_status.php`,
  GET_REFERRAL_URL: `${API_BASE}/get_referral_url.php`,

  // 📞 聯絡紀錄
  GET_CONTACT: `${API_BASE}/get_contact.php`,
  UPDATE_CONTACT: `${API_BASE}/update_contact.php`,
  DELETE_CONTACT: `${API_BASE}/delete_contact.php`,

  // 💼 業務 / 代理商管理
  GET_BUSINESS_LIST: `${API_BASE}/get_business_list.php`,
  GET_AGENT_LIST: `${API_BASE}/get_agent_list.php`,
  UPDATE_BUSINESS: `${API_BASE}/update_business.php`,
  UPDATE_AGENT: `${API_BASE}/update_agent.php`,
  EXPORT_AGENT_EXCEL: `${API_BASE}/export_agent_excel.php`,
  DELETE_BUSINESS_SHIFT: `${API_BASE}/delete_business_shift.php`,
  
  
  // 💼 業務班表設定
  GET_ALL_BUSINESS_SHIFTS: `${API_BASE}/get_all_business_shifts.php`,
  GET_BUSINESS_SHIFT: `${API_BASE}/get_business_shift.php`,
  UPDATE_BUSINESS_SHIFT: `${API_BASE}/update_business_shift.php`,

  // 💼 業務端客戶列表
  GET_BUSINESS_CUSTOMERS: `${API_BASE}/get_business_customers.php`,
  // 💼 業務端代理商列表
  GET_BUSINESS_AGENTS: `${API_BASE}/get_business_agents.php`,
  // 💼 業務端業績列表
  GET_BUSINESS_PERFORMANCE: `${API_BASE}/get_business_performance.php`,

  // 💼 代理商端客戶列表
  GET_AGENT_CUSTOMERS: `${API_BASE}/get_agent_customers.php`,

  // 💰 貸款管理
  GET_LOAN: `${API_BASE}/get_loan.php`,
  GET_LOAN_FILES: `${API_BASE}/get_loan_files.php`,
  UPDATE_LOAN: `${API_BASE}/update_loan_status.php`,
  LOAN_MANAGE: `${API_BASE}/loan_manage.php`,
  UPLOAD_FILE: `${API_BASE}/update_file.php`,
  UPLOAD_FOLLOWUP_FILE: `${API_BASE}/upload_followup_file.php`,
  UPDATE_FOLLOWUP_FILE: `${API_BASE}/update_followup_file.php`,
  DELETE_LOAN: `${API_BASE}/delete_loan.php`,

  // 📊 匯出報表
  EXPORT_EXCEL: `${API_BASE}/export_excel.php`,
  EXPORT_ALL_EXCEL: `${API_BASE}/export_all_excel.php`,

  // 🌐 前台使用的 API
  CONSULT_SUBMIT: `${API_FRONT_BASE}/consult_submit.php`,
  SUBMIT_LOAN: `${API_FRONT_BASE}/submit_loan.php`,
  CONTRACT_PDF: `${API_FRONT_BASE}/contract_pdf.php`,
  DOWNLOAD_CONTRACT: `${API_FRONT_BASE}/download_contract.php`,
};

// =======================================================
// 🧠 封裝共用 Fetch 函式
// =======================================================

/**
 * 通用 API 請求（自動帶 credentials）
 * @param {string} url - API 完整 URL
 * @param {object} options - fetch 設定（method, body 等）
 */
export async function fetchAPI(url, options = {}) {
  try {
    console.log("📡 fetchAPI 呼叫來源：", new Error().stack);
    console.log("📡 fetchAPI 請求網址：", url);

    const res = await fetch(url, {
      ...options, // 先展開外部設定
      credentials: "include", // ✅ 永遠帶上 session cookie
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await res.text(); // 避免伺服器輸出 HTML
    try {
      return JSON.parse(text);
    } catch {
      console.error("❌ 無法解析 JSON：", text);
      return { success: false, error: "伺服器回傳格式錯誤" };
    }
  } catch (err) {
    console.error("❌ API 請求錯誤:", url, err);
    return { success: false, error: "網路連線或伺服器錯誤" };
  }
}


// 匯出
export { API, API_BASE };
export default API;
