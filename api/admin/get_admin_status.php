<?php
// ==================================================
// get_admin_stats.php — MoneyFast 統一 Session（跨子網域 + localhost）
// ==================================================

// 🚫 防止 PHP 自動開 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_admin_stats_error.log');
error_reporting(E_ALL);

// ==================================================
// 相容性補丁（防止 PHP 版本缺 str_contains）
// ==================================================
if (!function_exists('str_contains')) {
  function str_contains($haystack, $needle) {
    return $needle !== '' && strpos($haystack, $needle) !== false;
  }
}

// ==================================================
// 環境設定（自動偵測 HTTPS / 子網域）
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'moneyfast.cc';
$isHttps = ($protocol === 'https');

// ==================================================
// CORS 設定（與 login/check_session 相同）
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  'https://moneyfast.cc',
  'https://www.moneyfast.cc',
  'https://2025.moneyfast.cc',
  'https://www.2025.moneyfast.cc'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// Session 統一設定（與 login.php 一致）
// ==================================================
if (str_contains($host, 'localhost')) {
  $cookieDomain = 'localhost';
  $secure = false;
  $sameSite = 'Lax';
} else {
  $cookieDomain = '.moneyfast.cc';
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

session_start();
error_log("=== get_admin_stats.php 啟動 ===");
error_log("Host=$host | Domain=$cookieDomain | Session ID=" . session_id());
error_log("Session content: " . print_r($_SESSION, true));

// ==================================================
// 驗證登入狀態（與 login/check_session 一致）
// ==================================================
if (empty($_SESSION['user'])) {
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

$user = $_SESSION['user'];
$role = $user['role'] ?? '';

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';
$db = new Database();
$conn = $db->getConnection();
if (!$conn) {
  echo json_encode(['success' => false, 'error' => '資料庫連線失敗']);
  exit;
}

// ==================================================
// 統計邏輯
// ==================================================
try {
  $stats = [];
  $recent = [];

  // ✅ Admin / SAdmin：全系統統計
  if (in_array($role, ['Admin', 'SAdmin'])) {
    $stats = [
      'total'    => $conn->query("SELECT COUNT(*) FROM loan_applications")->fetchColumn(),
      'pending'  => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE loan_status = '待審核'")->fetchColumn(),
      'approved' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE loan_status = '已核准'")->fetchColumn(),
      'rejected' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE loan_status = '已拒絕'")->fetchColumn(),
    ];

    $stmt = $conn->query("
      SELECT id, name, installment_amount AS loan_amount, loan_status, created_at
      FROM loan_applications
      ORDER BY created_at DESC
      LIMIT 5
    ");
    $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // ✅ BAdmin（商家帳號）
  elseif ($role === 'BAdmin' && isset($user['referral_code'])) {
    $code = $user['referral_code'];

    $stats = [
      'total'    => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code'")->fetchColumn(),
      'approved' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code' AND loan_status = '已核准'")->fetchColumn(),
      'rejected' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code' AND loan_status = '已拒絕'")->fetchColumn(),
    ];

    $stmt = $conn->prepare("
      SELECT id, name, installment_amount AS loan_amount, loan_status, updated_at
      FROM loan_applications
      WHERE referral_code = :code
      ORDER BY updated_at DESC
      LIMIT 5
    ");
    $stmt->execute([':code' => $code]);
    $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // ✅ GAdmin（代理商帳號）
  elseif ($role === 'GAdmin' && isset($user['referral_code'])) {
    $code = $user['referral_code'];

    $stats = [
      'total'    => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code'")->fetchColumn(),
      'approved' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code' AND loan_status = '已核准'")->fetchColumn(),
      'rejected' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE referral_code = '$code' AND loan_status = '已拒絕'")->fetchColumn(),
    ];

    $stmt = $conn->prepare("
      SELECT id, name, phone, loan_status, updated_at
      FROM loan_applications
      WHERE referral_code = :code
      ORDER BY updated_at DESC
      LIMIT 5
    ");
    $stmt->execute([':code' => $code]);
    $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // ==================================================
  // 回傳統一格式
  // ==================================================
  echo json_encode([
    'success' => true,
    'user' => $user,
    'role' => $role,
    'stats' => $stats,
    'recent' => $recent
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  http_response_code(500);
  error_log("get_admin_stats Error: " . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
