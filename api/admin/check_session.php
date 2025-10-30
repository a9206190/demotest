<?php
// ==================================================
// check_session.php — MoneyFast 統一 Session（跨子網域 + localhost）
// ==================================================
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/check_session_error.log');
error_reporting(E_ALL);

// === 相容性補丁 ===
if (!function_exists('str_contains')) {
  function str_contains($haystack, $needle) {
    return $needle !== '' && strpos($haystack, $needle) !== false;
  }
}

// ==================================================
// 1️⃣ 環境設定
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'moneyfast.cc';
$isHttps = ($protocol === 'https');

// ==================================================
// 2️⃣ CORS
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  'https://moneyfast.cc',
  'https://www.moneyfast.cc',
  'https://2025.moneyfast.cc'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// 3️⃣ Session 統一設定（for www.moneyfast.cc）
// ==================================================
if (str_contains($host, 'localhost')) {
  $cookieDomain = 'localhost';
  $secure = false;
  $sameSite = 'Lax';
} else {
  // ✅ 固定使用 www.moneyfast.cc，避免多重 cookie 混亂
  $cookieDomain = 'www.moneyfast.cc';
  $secure = true;
  $sameSite = 'None';
}

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


session_start();
error_log("=== check_session.php 啟動 ===");
error_log("Host=$host | Domain=$cookieDomain | Session ID=" . session_id());
error_log("Session content: " . print_r($_SESSION, true));

// ==================================================
// 4️⃣ 驗證登入狀態
// ==================================================
if (!empty($_SESSION['user'])) {
  echo json_encode([
    'success' => true,
    'loggedIn' => true,
    'user' => $_SESSION['user'],
    'session_id' => session_id(),
    'session_name' => session_name()
  ], JSON_UNESCAPED_UNICODE);
} else {
  echo json_encode([
    'success' => false,
    'error' => '未登入或登入已過期'
  ], JSON_UNESCAPED_UNICODE);
}
?>
