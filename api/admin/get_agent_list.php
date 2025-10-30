<?php
// ==================================================
// get_agent_list.php — 代理商列表查詢 API（統一 Session / CORS 機制版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_agent_list_error.log');
error_reporting(E_ALL);

// ==================================================
// PHP 版本相容（避免舊版無 str_contains）
// ==================================================
if (!function_exists('str_contains')) {
  function str_contains($haystack, $needle) {
    return $needle !== '' && strpos($haystack, $needle) !== false;
  }
}

// ==================================================
// 環境偵測
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$inDemo = str_contains(__DIR__, '/demo/');
$basePath = $inDemo ? '/demo/' : '/';

// ==================================================
// CORS 設定（與 check_session 同步）
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
// Session 安全設定（與 check_session 一致）
// ==================================================
$isHttps = ($protocol === 'https');
session_set_cookie_params([
  'lifetime' => 0,
  'path' => $basePath,
  'domain' => $host,
  'secure' => $isHttps,
  'httponly' => true,
  'samesite' => 'None'
]);
session_start();

// ==================================================
// 驗證登入狀態
// ==================================================
if (empty($_SESSION['admin_user'])) {
  echo json_encode(['success' => false, 'error' => '未登入或憑證過期']);
  exit;
}

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) {
    throw new Exception('資料庫連線失敗');
  }

  // ==================================================
  // 搜尋條件
  // ==================================================
  $keyword = trim($_GET['keyword'] ?? '');
  $params = [];

  $sql = "
    SELECT 
      id,
      agent_id,
      name,
      phone,
      referral_code,
      referral_url,
      customer_count,
      referral_count,
      receivable_amount,
      total_performance,
      bad_debt_amount,
      bad_debt_count,
      referral_bonus,
      performance_bonus,
      status,
      created_at
    FROM agent_list
  ";

  if ($keyword !== '') {
    $sql .= "
      WHERE 
        name COLLATE utf8mb4_unicode_ci LIKE :kw OR
        phone COLLATE utf8mb4_unicode_ci LIKE :kw OR
        agent_id COLLATE utf8mb4_unicode_ci LIKE :kw OR
        referral_code COLLATE utf8mb4_unicode_ci LIKE :kw
    ";
    $params[':kw'] = "%$keyword%";
  }

  $sql .= ' ORDER BY created_at DESC';

  $stmt = $conn->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'count' => count($rows),
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
