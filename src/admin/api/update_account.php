<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../../../config/Database.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
  $db = new Database();
  $conn = $db->getConnection();

  $data = json_decode(file_get_contents('php://input'), true);
  $id = $data['id'] ?? null;
  $username = trim($data['username'] ?? '');
  $full_name = trim($data['full_name'] ?? '');
  $role = trim($data['role'] ?? '');
  $status = trim($data['status'] ?? 'active');
  $new_password = trim($data['new_password'] ?? '');

  if (!$id || !$username || !$full_name || !$role) {
    echo json_encode(['success' => false, 'error' => '缺少必要欄位']);
    exit;
  }

  // ✅ 檢查帳號是否重複
  $check = $conn->prepare("SELECT id FROM admin_list WHERE username = :u AND id != :id");
  $check->execute([':u' => $username, ':id' => $id]);
  if ($check->fetch()) {
    echo json_encode(['success' => false, 'error' => '帳號名稱已被使用']);
    exit;
  }

  // ✅ 若有輸入新密碼 → 重新加密
  if ($new_password !== '') {
    $hash = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare("
      UPDATE admin_list
      SET username = :u, full_name = :f, role = :r, status = :s, password_hash = :p
      WHERE id = :id
    ");
    $stmt->execute([
      ':u' => $username,
      ':f' => $full_name,
      ':r' => $role,
      ':s' => $status,
      ':p' => $hash,
      ':id' => $id
    ]);
  } else {
    $stmt = $conn->prepare("
      UPDATE admin_list
      SET username = :u, full_name = :f, role = :r, status = :s
      WHERE id = :id
    ");
    $stmt->execute([
      ':u' => $username,
      ':f' => $full_name,
      ':r' => $role,
      ':s' => $status,
      ':id' => $id
    ]);
  }

  echo json_encode(['success' => true, 'message' => '帳號更新成功']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
