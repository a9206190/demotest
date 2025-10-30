<?php
// ==================================================
// update_followup_note.php — 更新貸後追蹤檔案備註（統一 Session + CORS + 安全強化版）
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID（避免污染）
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/update_followup_note_error.log');
error_reporting(E_ALL);

// === 全域例外攔截（確保永遠回傳 JSON）===
set_exception_handler(function ($e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤',
    'message' => $e->getMessage(),
    'file' => basename($e->getFile()),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
  exit;
});

try {
  // ==================================================
  // ✅ 統一載入 MoneyFast Session / CORS 模組
  // ==================================================
  require_once __DIR__ . '/init_session.php';

  // === CORS 預檢 ===
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }

  // === 僅允許 POST ===
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => '無效的請求方法']);
    exit;
  }

  // ==================================================
  // ✅ Session 驗證（你的系統是 $_SESSION['user']）
  // ==================================================
  if (session_status() === PHP_SESSION_NONE) session_start();

  if (empty($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
    exit;
  }

  // ==================================================
  // ✅ 載入資料庫
  // ==================================================
  require_once __DIR__ . '/../../config/Database.php';
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // ✅ 接收資料
  // ==================================================
  $data = json_decode(file_get_contents('php://input'), true);
  $id = intval($data['id'] ?? 0);
  $note = trim($data['note'] ?? '');

  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少 ID']);
    exit;
  }

  // ==================================================
  // ✅ 更新備註
  // ==================================================
  $stmt = $conn->prepare("
    UPDATE loan_followup_files 
    SET note = :note, updated_at = NOW()
    WHERE id = :id
  ");
  $stmt->execute([':note' => $note, ':id' => $id]);

  // ==================================================
  // ✅ 查詢更新後的紀錄
  // ==================================================
  $stmt2 = $conn->prepare("
    SELECT 
      id, file_path, uploader, note,
      DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i:%s') AS uploaded_at,
      DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM loan_followup_files
    WHERE id = :id
  ");
  $stmt2->execute([':id' => $id]);
  $updated = $stmt2->fetch(PDO::FETCH_ASSOC);

  // ==================================================
  // ✅ 成功回傳
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => '✅ 備註更新成功',
    'data' => $updated
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤',
    'message' => $e->getMessage(),
    'file' => basename($e->getFile()),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
  exit;
}
