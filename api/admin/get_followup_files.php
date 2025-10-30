<?php
// ==================================================
// get_loan_followup_files.php — 查詢追蹤附件列表（統一 Session + CORS 版）
// ==================================================
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_loan_followup_files_error.log');
error_reporting(E_ALL);

// ==================================================
// ✅ 導入統一 Session + CORS 模組
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
    error_log("[CORS] 使用 init_session: $path");
    break;
  }
}
if (!$initLoaded) {
  echo json_encode(['success' => false, 'error' => '❌ 找不到 init_session.php']);
  exit;
}

// ==================================================
// ✅ 額外補強 CORS（防止空 Origin）
// ==================================================
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
if ($origin) {
  $origin = rtrim($origin, '/');
  if (str_contains($origin, 'moneyfast.cc') || str_contains($origin, 'localhost')) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
  }
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
  error_log('[AUTH] 未登入或登入已過期');
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

$loginUser = $_SESSION['admin_user']['username']
  ?? $_SESSION['sadmin_user']['username']
  ?? $_SESSION['badmin_user']['username']
  ?? $_SESSION['gadmin_user']['username']
  ?? $_SESSION['user']['username']
  ?? '未知';
error_log("[AUTH OK] get_loan_followup_files 由使用者 {$loginUser} 執行");

// ==================================================
// ✅ 參數驗證
// ==================================================
$id = $_GET['id'] ?? '';
if (!$id || !is_numeric($id)) {
  echo json_encode(['success' => false, 'error' => '參數錯誤']);
  exit;
}

// ==================================================
// ✅ 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // 📂 查詢追蹤附件列表
  // ==================================================
  $stmt = $conn->prepare("
    SELECT 
      id,
      file_path,
      uploader,
      note,
      uploaded_at
    FROM loan_followup_files
    WHERE application_id = :id
    ORDER BY uploaded_at DESC
  ");
  $stmt->execute([':id' => $id]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // ==================================================
  // 🌐 自動偵測 Base URL（支援正式站與 /demo 子資料夾）
  // ==================================================
  $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $baseUrl = rtrim("$protocol://$host", '/');

  if (str_contains(__DIR__, '/demo/')) {
    $baseUrl .= '/demo';
  }

  foreach ($rows as &$r) {
    $filePath = ltrim($r['file_path'], '/');
    $r['file_path'] = "$baseUrl/$filePath";
  }

  // ==================================================
  // ✅ 回傳結果
  // ==================================================
  echo json_encode([
    'success' => true,
    'count' => count($rows),
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  error_log("[OK] get_loan_followup_files ID={$id} 成功回傳，共 " . count($rows) . " 筆");

} catch (Throwable $e) {
  http_response_code(500);
  error_log('[ERROR get_loan_followup_files.php] ' . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
?>
