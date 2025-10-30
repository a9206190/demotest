<?php
// ==================================================
// init_session.php — MoneyFast 統一 Session + CORS 模組（跨子網域最終版）
// ==================================================

// 🚫 防止 PHP 自動開 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

// === 安全設定 ===
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ==================================================
// 1️⃣ 環境偵測
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'moneyfast.cc';
$isHttps = ($protocol === 'https');

// ==================================================
// 2️⃣ Cookie domain / SameSite 設定
// ==================================================
if (str_contains($host, 'localhost')) {
  $cookieDomain = 'localhost';
  $secure = false;
  $sameSite = 'Lax';
} else {
  // ✅ 允許所有 moneyfast.cc 子網域共用 session
  $cookieDomain = '.moneyfast.cc';
  $secure = true;
  $sameSite = 'None';
}

// ==================================================
// 3️⃣ CORS 自動處理（💡核心段落）
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  'https://moneyfast.cc',
  'https://www.moneyfast.cc'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin) {
  if (in_array($origin, $allowed_origins, true) || preg_match('/\.moneyfast\.cc$/', parse_url($origin, PHP_URL_HOST))) {
    // ✅ 允許所有 moneyfast.cc 子網域（含 www）
    header("Access-Control-Allow-Origin: $origin");
    header("Vary: Origin"); // 🔒 防止快取污染
  }
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ✅ 處理預檢請求（OPTIONS）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// 4️⃣ Session 路徑設定
// ==================================================
$sessionPath = __DIR__ . '/../../sessions';
if (!is_dir($sessionPath)) mkdir($sessionPath, 0777, true);

session_save_path($sessionPath);
session_set_cookie_params([
  'lifetime' => 86400,
  'path' => '/',
  'domain' => $cookieDomain,
  'secure' => $secure,
  'httponly' => true,
  'samesite' => $sameSite
]);

ini_set('session.cookie_domain', $cookieDomain);
ini_set('session.cookie_samesite', $sameSite);
ini_set('session.cookie_secure', $secure ? '1' : '0');
ini_set('session.gc_maxlifetime', 86400);
ini_set('session.use_strict_mode', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.use_trans_sid', 0);

// ==================================================
// 5️⃣ 啟動 Session
// ==================================================
session_start();

// ==================================================
// 🧩 Debug log（可關掉）
// ==================================================
error_log("=== init_session 啟動 ===");
error_log("Host=$host | Origin=$origin | Domain=$cookieDomain | HTTPS=" . ($isHttps ? 'ON' : 'OFF'));
error_log("Session ID=" . session_id());
?>
