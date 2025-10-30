<?php
// ==================================================
// get_agent_customers.php
// 代理商端：取得自己推薦的客戶列表（統一 session 機制版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_agent_customers_error.log');
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
// CORS 設定（與 check_session 一致）
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
  echo json_encode(['success' => false, 'error' => '未登入']);
  exit;
}

$user = $_SESSION['admin_user'];
$role = $user['role'] ?? '';
$agent_id = $user['agent_id'] ?? '';
$referral_code = $user['referral_code'] ?? '';
$name = $user['name'] ?? '';

// 僅允許 GAdmin 或具 referral_code 的帳號
if ($role !== 'GAdmin' && !$referral_code) {
  echo json_encode(['success' => false, 'error' => '無權限']);
  exit;
}

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $pdo = $db->getConnection();

  if (!$pdo) {
    throw new Exception('資料庫連線失敗');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // ==================================================
  // 取得 agent_id
  // ==================================================
  if (empty($agent_id)) {
    $sqlAgent = "SELECT agent_id FROM agent_list WHERE referral_code = :ref OR name = :name LIMIT 1";
    $stmt = $pdo->prepare($sqlAgent);
    $stmt->execute([
      ':ref' => $referral_code,
      ':name' => $name
    ]);
    $agent = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$agent) {
      echo json_encode(['success' => false, 'error' => '找不到對應的代理商資料']);
      exit;
    }
    $agent_id = $agent['agent_id'];
  }

  // ==================================================
  // 查詢客戶資料
  // ==================================================
  $sql = "
    SELECT 
        l.id,
        l.name,
        l.phone,
        l.installment_amount AS loan_amount,
        l.loan_status AS status,
        l.apply_date,
        b.name AS business_name
    FROM loan_applications l
    LEFT JOIN business_list b ON l.business_id = b.business_id
    WHERE l.agent_id = :agent_id
  ";

  $search = trim($_GET['search'] ?? '');
  if ($search !== '') {
    $sql .= " AND (l.name LIKE :search OR l.phone LIKE :search)";
  }

  $sql .= " ORDER BY l.created_at DESC";

  $stmt = $pdo->prepare($sql);
  $stmt->bindValue(':agent_id', $agent_id, PDO::PARAM_STR);
  if ($search !== '') {
    $stmt->bindValue(':search', "%$search%", PDO::PARAM_STR);
  }
  $stmt->execute();

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  exit;

} catch (Throwable $e) {
  error_log('get_agent_customers.php Error: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
  exit;
}
