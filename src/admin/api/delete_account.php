<?php
// =============================
// delete_account.php
// =============================

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../../../config/Database.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start(); // ✅ 即使前端不強制登入，也允許從 session 辨識自己

try {
  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 從 GET 拿要刪除的 ID
  $id = $_GET['id'] ?? null;
  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少帳號 ID']);
    exit;
  }

  // ✅ 如果有登入者，就檢查是否要刪自己
  if (isset($_SESSION['admin_user']['id']) && $_SESSION['admin_user']['id'] == $id) {
    echo json_encode(['success' => false, 'error' => '⚠️ 無法刪除自己的帳號']);
    exit;
  }

  // ✅ 確認該帳號是否存在
  $check = $conn->prepare("SELECT COUNT(*) FROM admin_list WHERE id = :id");
  $check->execute([':id' => $id]);
  if ($check->fetchColumn() == 0) {
    echo json_encode(['success' => false, 'error' => '帳號不存在']);
    exit;
  }

  // ✅ 執行刪除
  $stmt = $conn->prepare("DELETE FROM admin_list WHERE id = :id");
  $stmt->execute([':id' => $id]);

  echo json_encode(['success' => true, 'message' => '帳號刪除成功']);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
