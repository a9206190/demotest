<?php
// ==================================================
// delete_loan.php — 刪除貸款申請（統一 Session + CORS + 安全版）
// ==================================================
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/delete_loan_error.log');
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
    error_log("[SESSION] 使用 init_session: $path");
    break;
  }
}
if (!$initLoaded) {
  echo json_encode(['success' => false, 'error' => '❌ 找不到 init_session.php']);
  exit;
}

// ==================================================
// ✅ 驗證登入狀態（支援多角色）
// ==================================================
if (
  empty($_SESSION['user']) &&
  empty($_SESSION['admin_user']) &&
  empty($_SESSION['sadmin_user']) &&
  empty($_SESSION['badmin_user']) &&
  empty($_SESSION['gadmin_user'])
) {
  echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
  exit;
}

$loginName = $_SESSION['admin_user']['username']
  ?? $_SESSION['sadmin_user']['username']
  ?? $_SESSION['badmin_user']['username']
  ?? $_SESSION['gadmin_user']['username']
  ?? $_SESSION['user']['username']
  ?? '未知';

error_log("[AUTH] delete_loan 由使用者 {$loginName} 執行");

// ==================================================
// ✅ 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $input = json_decode(file_get_contents('php://input'), true);
  $id = intval($input['id'] ?? 0);

  if (!$id) {
    echo json_encode(['success' => false, 'error' => '❌ 缺少必要參數 ID']);
    exit;
  }

  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) {
    throw new Exception('資料庫連線失敗');
  }

  // ==================================================
  // ✅ 確認申請是否存在
  // ==================================================
  $check = $conn->prepare("SELECT COUNT(*) FROM loan_applications WHERE id = :id");
  $check->execute([':id' => $id]);
  if ($check->fetchColumn() == 0) {
    echo json_encode(['success' => false, 'error' => '資料不存在']);
    exit;
  }

  // ==================================================
  // ✅ 同時刪除關聯檔案
  // ==================================================
  $deleteFiles = $conn->prepare("DELETE FROM loan_application_files WHERE application_id = :id");
  $deleteFiles->execute([':id' => $id]);

  // ==================================================
  // ✅ 刪除主紀錄
  // ==================================================
  $deleteLoan = $conn->prepare("DELETE FROM loan_applications WHERE id = :id");
  $deleteLoan->execute([':id' => $id]);

  // ==================================================
  // ✅ 成功回傳
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => "✅ 貸款紀錄 (ID={$id}) 已成功刪除"
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  error_log("[DELETE] Loan ID={$id} 已刪除 by {$loginName}");

} catch (Throwable $e) {
  http_response_code(500);
  error_log('[ERROR delete_loan.php] ' . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
