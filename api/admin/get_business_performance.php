<?php
// ==================================================
// get_business_performance.php — 業績查詢 API（統一 Session / CORS 版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_business_performance_error.log');
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
// CORS 設定（固定三網域）
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
// Session 安全設定（統一 check_session 機制）
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
  // 取得參數
  // ==================================================
  $business_id = $_GET['business_id'] ?? '';
  $search = trim($_GET['search'] ?? '');
  $mode = $_GET['mode'] ?? 'year'; // 'year' 或 'month'
  $year = intval($_GET['year'] ?? date('Y'));
  $month = intval($_GET['month'] ?? date('n'));

  if (!$business_id) {
    echo json_encode(['success' => false, 'error' => '缺少 business_id']);
    exit;
  }

  // ==================================================
  // 條件組合
  // ==================================================
  $where = "WHERE la.business_id COLLATE utf8mb4_unicode_ci = :bid";
  if ($search !== '') {
    $where .= " AND (la.name COLLATE utf8mb4_unicode_ci LIKE :kw OR la.phone COLLATE utf8mb4_unicode_ci LIKE :kw)";
  }

  // 年/月篩選
  if ($mode === 'year') {
    $where .= " AND YEAR(la.apply_date) = :year";
  } else {
    $where .= " AND YEAR(la.apply_date) = :year AND MONTH(la.apply_date) = :month";
  }

  // ==================================================
  // 查詢資料
  // ==================================================
  $sql = "
    SELECT 
      la.id,
      la.name,
      la.phone,
      la.receivable_amount,
      la.actual_revenue,
      la.bad_debt,
      la.apply_date
    FROM loan_applications la
    $where
    ORDER BY la.apply_date DESC
  ";

  $stmt = $conn->prepare($sql);

  $params = [
    ':bid' => $business_id,
    ':year' => $year
  ];
  if ($search !== '') $params[':kw'] = "%$search%";
  if ($mode === 'month') $params[':month'] = $month;

  $stmt->execute($params);
  $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'count' => count($data),
    'data' => $data
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  error_log('[ERROR get_business_performance.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
