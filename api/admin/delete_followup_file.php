<?php
// ==================================================
// delete_followup_file.php — 刪除貸後追蹤附件（統一 Session + CORS ）
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID（避免污染）
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/delete_followup_file_error.log');
error_reporting(E_ALL);

// === 全域例外攔截（確保一定輸出 JSON）===
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
  // ✅ 載入統一 Session / CORS 模組
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
  // ✅ Session 驗證（改用你實際的 $_SESSION['user']）
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
  // ✅ 取得要刪除的檔案 ID
  // ==================================================
  $data = json_decode(file_get_contents('php://input'), true);
  $id = intval($data['id'] ?? 0);

  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少 ID']);
    exit;
  }

  // ==================================================
  // ✅ 查詢檔案路徑
  // ==================================================
  $stmt = $conn->prepare('SELECT file_path FROM loan_followup_files WHERE id = :id');
  $stmt->execute([':id' => $id]);
  $path = $stmt->fetchColumn();

  if ($path) {
    $absolutePath = __DIR__ . '/../../../' . $path;
    if (file_exists($absolutePath)) {
      @unlink($absolutePath);
    }
  }

  // ==================================================
  // ✅ 刪除資料庫紀錄
  // ==================================================
  $delete = $conn->prepare('DELETE FROM loan_followup_files WHERE id = :id');
  $delete->execute([':id' => $id]);

  // ==================================================
  // ✅ 成功回傳
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => '✅ 追蹤附件已成功刪除'
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
