<?php
// ==================================================
// upload_followup_file.php — 上傳貸後追蹤附件（統一 Session + CORS + 安全強化版）
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID（避免污染）
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/upload_followup_file_error.log');
error_reporting(E_ALL);

// === 全域例外攔截，確保一定輸出 JSON ===
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
  // ✅ Session 驗證（根據你的實際結構改為 $_SESSION['user']）
  // ==================================================
  if (session_status() === PHP_SESSION_NONE) session_start();

  if (empty($_SESSION['user'])) {
    echo json_encode(['success' => false, 'error' => '未登入或登入逾時']);
    exit;
  }

  // ==================================================
  // ✅ 驗證上傳資料
  // ==================================================
  if (empty($_POST['application_id']) || !is_numeric($_POST['application_id'])) {
    echo json_encode(['success' => false, 'error' => '缺少或無效的申貸 ID']);
    exit;
  }
  if (!isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'error' => '未收到上傳檔案']);
    exit;
  }

  $applicationId = intval($_POST['application_id']);
  $note = trim($_POST['note'] ?? '');

  // ==================================================
  // ✅ 上傳目錄（安全 & 統一）
  // ==================================================
  $uploadDir = __DIR__ . '/../../uploads/followup';
  if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

  $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
  $safeName = 'followup_' . $applicationId . '_' . time() . '.' . $ext;
  $relativePath = 'uploads/followup/' . $safeName;
  $targetFile = $uploadDir . $safeName;

  if (!move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) {
    throw new Exception('無法儲存上傳檔案');
  }

  // ==================================================
  // ✅ 寫入資料庫
  // ==================================================
  require_once __DIR__ . '/../../config/Database.php';
  $db = new Database();
  $conn = $db->getConnection();

  if (!$conn) {
    throw new Exception('資料庫連線失敗');
  }

  $uploader = is_array($_SESSION['user'])
    ? ($_SESSION['user']['username'] ?? 'user')
    : $_SESSION['user'];

  $stmt = $conn->prepare("
    INSERT INTO loan_followup_files (application_id, file_path, uploader, note, uploaded_at)
    VALUES (:aid, :path, :uploader, :note, NOW())
  ");
  $stmt->execute([
    ':aid' => $applicationId,
    ':path' => $relativePath,
    ':uploader' => $uploader,
    ':note' => $note
  ]);

  // ==================================================
  // ✅ 自動偵測 Base URL（支援 demo 子資料夾）
  // ==================================================
  $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $scriptDir = dirname($_SERVER['SCRIPT_NAME']);
  $baseUrl = (strpos($scriptDir, '/demo') !== false)
    ? "$protocol://$host/demo/"
    : "$protocol://$host/";

  // ==================================================
  // ✅ 成功回傳
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => '✅ 追蹤附件上傳成功',
    'application_id' => $applicationId,
    'file_path' => $relativePath,
    'uploader' => $uploader,
    'note' => $note,
    'full_url' => $baseUrl . ltrim($relativePath, '/')
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
