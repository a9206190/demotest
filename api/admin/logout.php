<?php
// ==================================================
//  logout.php — React 登出 API（自動路徑 + 跨域安全）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logout_error.log');
error_reporting(E_ALL);

// ==================================================
// 1️⃣ 自動偵測環境與目錄（同步 apiConfig.js）
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$inDemo = str_contains($_SERVER['REQUEST_URI'] ?? '', '/demo/');
$basePath = $inDemo ? '/demo/' : '/';

// ==================================================
// 2️⃣ CORS 設定
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  "$protocol://$host",
  "$protocol://www.$host"
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");

// ✅ Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// 3️⃣ Session 設定（自動根據目錄）
// ==================================================
session_set_cookie_params([
  'lifetime' => 0,
  'path' => $basePath,
  'domain' => $host,
  'secure' => !empty($_SERVER['HTTPS']),
  'httponly' => true,
  'samesite' => 'None'
]);
session_start();

// ==================================================
// 4️⃣ 清除 Session 資料
// ==================================================
$_SESSION = [];

if (ini_get("session.use_cookies")) {
  $params = session_get_cookie_params();
  setcookie(
    session_name(),
    '',
    time() - 42000,
    $params["path"],
    $params["domain"],
    true,
    true
  );
}

session_destroy();

// ==================================================
// 5️⃣ 回傳結果
// ==================================================
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
  'success' => true,
  'message' => '已成功登出',
  'basePath' => $basePath
]);
exit;
?>
