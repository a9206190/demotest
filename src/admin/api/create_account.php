<?php
// =============================
// create_account.php
// =============================

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../../config/Database.php';

try {
  // ✅ 連線資料庫
  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 解析前端資料
  $data = json_decode(file_get_contents('php://input'), true);
  $username  = trim($data['username'] ?? '');
  $password  = trim($data['password'] ?? '');
  $full_name = trim($data['full_name'] ?? '');
  $role      = trim($data['role'] ?? 'BAdmin');
  $status    = 'active';

  // ✅ 檢查欄位
  if (!$username || !$password || !$full_name) {
    echo json_encode(['success' => false, 'error' => '欄位不得為空']);
    exit;
  }

  // ✅ 檢查帳號是否已存在
  $check = $conn->prepare("SELECT COUNT(*) FROM admin_list WHERE username = :u");
  $check->execute([':u' => $username]);
  if ($check->fetchColumn() > 0) {
    echo json_encode(['success' => false, 'error' => '帳號已存在']);
    exit;
  }

  // ✅ 密碼加密
  $hash = password_hash($password, PASSWORD_BCRYPT);

  // ✅ 寫入資料庫
  $stmt = $conn->prepare("
    INSERT INTO admin_list (username, full_name, password_hash, role, status, created_at)
    VALUES (:u, :f, :p, :r, :s, CURRENT_TIMESTAMP)
  ");
  $stmt->execute([
    ':u' => $username,
    ':f' => $full_name,
    ':p' => $hash,
    ':r' => $role,
    ':s' => $status
  ]);

  echo json_encode(['success' => true, 'message' => '帳號建立成功']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
