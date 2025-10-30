<?php
// ==================================================
// delete_contact.php — 刪除聯絡紀錄（統一 Session + CORS 強化版）
// ==================================================

if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/delete_contact_error.log');
error_reporting(E_ALL);

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
  // ✅ 統一 Session / CORS 初始化
  require_once __DIR__ . '/init_session.php';

  // === OPTIONS 預檢 ===
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
  }

  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => '無效的請求方法']);
    exit;
  }

  if (session_status() === PHP_SESSION_NONE) session_start();

  
  if (empty($_SESSION['user']) && empty($_SESSION['admin_user'])) { 
    echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
    exit;
  }

  $input = json_decode(file_get_contents('php://input'), true);
  if (!is_array($input)) {
    echo json_encode(['success' => false, 'error' => '請求格式錯誤']);
    exit;
  }

  $id = $input['id'] ?? '';
  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少聯絡紀錄 ID']);
    exit;
  }

  require_once __DIR__ . '/../../config/Database.php';
  $db = new Database();
  $conn = $db->getConnection();

  $check = $conn->prepare('SELECT COUNT(*) FROM consult_requests WHERE id = :id');
  $check->execute([':id' => $id]);
  if ($check->fetchColumn() == 0) {
    echo json_encode(['success' => false, 'error' => '紀錄不存在']);
    exit;
  }

  $stmt = $conn->prepare('DELETE FROM consult_requests WHERE id = :id');
  $stmt->execute([':id' => $id]);

  echo json_encode(['success' => true, 'message' => '聯絡紀錄已成功刪除'], JSON_UNESCAPED_UNICODE);
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
