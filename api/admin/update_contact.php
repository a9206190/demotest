<?php
// ==================================================
// update_contact.php — 更新聯繫狀態與備註（統一版，使用 init_session.php）
// ==================================================

// === 安全設定 ===
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/update_contact_error.log');
error_reporting(E_ALL);

// ==================================================
// ✅ 導入統一 Session + CORS 模組（自動搜尋）
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
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '❌ 無法載入 init_session.php'
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// ==================================================
// ✅ 驗證登入狀態
// ==================================================
if (empty($_SESSION['user'])) {
  error_log('[AUTH] 未登入或登入已過期');
  echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
  exit;
}

error_log('[AUTH] 使用者：' . ($_SESSION['user']['username'] ?? '未知'));

// ==================================================
// ✅ 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // 📥 取得輸入資料
  // ==================================================
  $input = json_decode(file_get_contents('php://input'), true);
  $id = intval($input['id'] ?? 0);
  $status = trim($input['status'] ?? '');
  $note = trim($input['contact_note'] ?? '');

  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少 ID']);
    exit;
  }

  // ==================================================
  // 🧩 更新聯繫紀錄  SET可加updated_at = NOW() 記錄更新
  // ==================================================
  $stmt = $conn->prepare("
    UPDATE consult_requests
    SET 
      status = :status,
      contact_note = :note
    WHERE id = :id
  ");
  $stmt->execute([
    ':status' => $status ?: '未聯繫',
    ':note' => $note,
    ':id' => $id
  ]);

  // ==================================================
  // 📤 查詢更新後資料
  // ==================================================
  $stmt2 = $conn->prepare("
    SELECT 
      id,
      name,
      phone,
      COALESCE(status, '未聯繫') AS status,
      COALESCE(contact_note, '') AS contact_note,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM consult_requests
    WHERE id = :id
  ");
  $stmt2->execute([':id' => $id]);
  $updated = $stmt2->fetch(PDO::FETCH_ASSOC);

  if (!$updated) throw new Exception("更新後查無資料 (id=$id)");

  // ==================================================
  // ✅ 成功回傳
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => '✅ 聯繫紀錄已更新',
    'data' => $updated
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  error_log("[update_contact.php] " . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
