<?php
// ==================================================
// get_referral_url.php — 根據推薦碼查詢 referral_url（統一 MoneyFast 版）
// 支援 business_list / agent_list、自動 CORS / Session（使用 init_session.php）
// ==================================================

// 🚫 防止 PHP 預設 session 混用
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_referral_url_error.log');
error_reporting(E_ALL);

// ==================================================
// ✅ 載入統一 Session / CORS 模組（init_session.php）
// ==================================================
$tryPaths = [
  __DIR__ . '/init_session.php',
  __DIR__ . '/../init_session.php',
  __DIR__ . '/../../admin/init_session.php'
];
$initLoaded = false;
foreach ($tryPaths as $path) {
  if (file_exists($path)) {
    require_once $path;
    $initLoaded = true;
    error_log("[INIT] 使用 init_session: $path");
    break;
  }
}
if (!$initLoaded) {
  echo json_encode(['success' => false, 'error' => '❌ 找不到 init_session.php']);
  exit;
}

// ==================================================
// ✅ 驗證登入狀態（支援所有角色）
// ==================================================
if (
  empty($_SESSION['user']) &&
  empty($_SESSION['admin_user']) &&
  empty($_SESSION['sadmin_user']) &&
  empty($_SESSION['badmin_user']) &&
  empty($_SESSION['gadmin_user'])
) {
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

// ==================================================
// ✅ 輸入參數
// ==================================================
$table = $_GET['table'] ?? '';
$referral_code = trim($_GET['referral_code'] ?? '');

if (!in_array($table, ['business_list', 'agent_list'])) {
  echo json_encode(['success' => false, 'error' => '無效的資料表']);
  exit;
}

if ($referral_code === '') {
  echo json_encode(['success' => false, 'error' => '缺少 referral_code']);
  exit;
}

// ==================================================
// ✅ 連線資料庫
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // 查詢推薦連結
  // ==================================================
  $stmt = $conn->prepare("
    SELECT referral_url 
    FROM {$table} 
    WHERE LOWER(referral_code) = LOWER(:code)
    LIMIT 1
  ");
  $stmt->execute([':code' => strtolower($referral_code)]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);

  // ==================================================
  // ✅ 若找到資料，直接回傳
  // ==================================================
  if ($row && !empty($row['referral_url'])) {
    echo json_encode([
      'success' => true,
      'table' => $table,
      'referral_code' => $referral_code,
      'referral_url' => $row['referral_url']
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
  }

  // ==================================================
  // 🧩 若查不到，但表格確實存在 → 動態組 URL（因為 referral_url 為 GENERATED 欄位）
  // ==================================================
  $paramName = $table === 'agent_list' ? 'agent' : 'ref';
  $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'moneyfast.cc';
  $generatedUrl = "{$protocol}://{$host}/loan?{$paramName}={$referral_code}";

  echo json_encode([
    'success' => true,
    'table' => $table,
    'referral_code' => $referral_code,
    'referral_url' => $generatedUrl,
    'note' => '✅ 自動生成推薦連結（資料表中可能尚未生成）'
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  error_log("[OK] Referral URL 已自動生成: {$generatedUrl}");

} catch (Throwable $e) {
  http_response_code(500);
  error_log('[ERROR get_referral_url.php] ' . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
?>
