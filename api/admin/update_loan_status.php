<?php
// ==================================================
// update_loan_status.php — 更新貸款狀態 / 備註+
// ==================================================
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/update_loan_error.log');
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
  empty($_SESSION['user'])&&
  empty($_SESSION['admin_user']) &&
  empty($_SESSION['sadmin_user']) &&
  empty($_SESSION['badmin_user']) &&
  empty($_SESSION['gadmin_user'])
) {
  error_log('[AUTH FAIL] 未登入或登入逾時');
  echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
  exit;
}

$loginName = $_SESSION['admin_user']['user']['username']
  ?? $_SESSION['user']['username']
  ?? $_SESSION['sadmin_user']['username']
  ?? $_SESSION['badmin_user']['username']
  ?? $_SESSION['gadmin_user']['username']
  ?? '未知';
error_log("[AUTH OK] update_loan 由使用者 {$loginName} 執行");

// ==================================================
// ✅ 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $input = json_decode(file_get_contents('php://input'), true);
  $id = intval($input['id'] ?? 0);
  $loan_status = trim($input['loan_status'] ?? '');
  $note = trim($input['note'] ?? '');

  $valid_status = [
    '待審核', '已核准', '已拒絕', '已取消',
    '逾期未付', '逾期已付', '已結清'
  ];

  if (!$id || !in_array($loan_status, $valid_status, true)) {
    echo json_encode(['success' => false, 'error' => '無效的狀態或缺少 ID']);
    exit;
  }

  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // ✅ 更新狀態與備註 可加updated_at = NOW()
  // ==================================================
  $stmt = $conn->prepare("
    UPDATE loan_applications
    SET loan_status = :loan_status,
        note = :note
    WHERE id = :id
  ");
  $stmt->execute([
    ':loan_status' => $loan_status,
    ':note' => $note,
    ':id' => $id
  ]);

  // ==================================================
  // ✅ 查詢更新後資料
  // ==================================================
  $stmt2 = $conn->prepare("
    SELECT id, name, phone, loan_status, note, updated_at
    FROM loan_applications
    WHERE id = :id
  ");
  $stmt2->execute([':id' => $id]);
  $updated = $stmt2->fetch(PDO::FETCH_ASSOC);

  echo json_encode([
    'success' => true,
    'message' => '✅ 狀態更新成功',
    'data' => $updated
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

  error_log("[UPDATE OK] Loan ID={$id} 已更新 by {$loginName}");

} catch (Throwable $e) {
  http_response_code(500);
  error_log('[ERROR update_loan.php] ' . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
