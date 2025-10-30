<?php
// ==================================================
// get_all_business_shifts.php — 管理員查詢全部業務排班（統一 session / CORS 版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_all_business_shifts_error.log');
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
// CORS 設定（固定 3 網域）
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  'https://moneyfast.cc',
  'https://www.moneyfast.cc'
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
// Session 安全設定（統一 check_session 架構）
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
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
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
  // 若表不存在則建立（安全保護）
  // ==================================================
  $conn->exec("
    CREATE TABLE IF NOT EXISTS business_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id VARCHAR(20) NOT NULL,
      shift_date DATE NOT NULL,
      work_shift ENUM('早班','午班','晚班') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_shift (business_id, shift_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ");

  // ==================================================
  // 查詢 JOIN 業務姓名
  // ==================================================
  $sql = "
    SELECT 
      bs.id,
      bs.business_id,
      COALESCE(bl.name, '（已刪除業務）') AS business_name,
      bs.shift_date,
      bs.work_shift,
      bs.created_at,
      bs.updated_at
    FROM business_shifts bs
    LEFT JOIN business_list bl ON bs.business_id = bl.business_id
    ORDER BY bs.shift_date DESC,
             FIELD(bs.work_shift, '早班','午班','晚班')
  ";

  $stmt = $conn->prepare($sql);
  $stmt->execute();
  $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'count' => count($data),
    'data' => $data
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  error_log('[ERROR get_all_business_shifts.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
