<?php
// ==================================================
//  auth_check.php — 後台頁面保護（自動偵測 demo 或正式站）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/auth_check_error.log');
error_reporting(E_ALL);

// --------------------------------------------------
// 1️⃣ 自動偵測環境與目錄（同步 apiConfig.js）
// --------------------------------------------------
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';

// ✅ 統一網域格式（移除前面的 www.，讓 cookie 不混亂）
$cleanHost = preg_replace('/^www\./', '', $host);

// ✅ 判斷是否在 /demo 下運行
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$inDemo = str_contains($requestUri, '/demo/');
$basePath = $inDemo ? '/demo/' : '/';

// --------------------------------------------------
// 2️⃣ Session 安全設定（必須在 start 之前）
// --------------------------------------------------
session_set_cookie_params([
  'lifetime' => 0,
  'path' => $basePath,                     // ✅ 自動切換 /demo 或 /
  'domain' => $cleanHost,                  // ✅ 同一網域可共用 cookie
  'secure' => !empty($_SERVER['HTTPS']),   // ✅ 僅在 HTTPS 傳送
  'httponly' => true,
  'samesite' => 'None'                     // ✅ 支援跨域 session
]);

session_start();

// --------------------------------------------------
// 3️⃣ 防止頁面快取（登出後無法返回）
// --------------------------------------------------
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// --------------------------------------------------
// 4️⃣ 安全性 Header（防止 XSS 與 Clickjacking）
// --------------------------------------------------
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("X-XSS-Protection: 1; mode=block");

// --------------------------------------------------
// 5️⃣ 登入檢查邏輯
// --------------------------------------------------
if (!isset($_SESSION['admin_user'])) {
  // ❌ 未登入 → 導回正確登入頁（自動判斷 demo 或正式站）
  $loginPath = $basePath . 'admin/login.html';

  // 🚫 防止重複導向 /demo/demo/admin/
  $loginPath = str_replace('//', '/', $loginPath);

  header("Location: $loginPath");
  exit;
}

// ✅ 已登入 → 提供 $user 給頁面使用
$user = $_SESSION['admin_user'];
?>
