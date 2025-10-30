<?php
// ==================================================
//  delete_account.php — 禁止刪除最高權限帳號 + 連動刪除 business_list / agent_list
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../../config/Database.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

try {
  $db = new Database();
  $conn = $db->getConnection();

  $id = $_GET['id'] ?? null;
  if (!$id) {
    echo json_encode(['success' => false, 'error' => '缺少帳號 ID']);
    exit;
  }

  // ✅ 檢查帳號是否存在與角色
  $check = $conn->prepare("SELECT role, username, full_name FROM admin_list WHERE id = :id");
  $check->execute([':id' => $id]);
  $target = $check->fetch(PDO::FETCH_ASSOC);

  if (!$target) {
    echo json_encode(['success' => false, 'error' => '帳號不存在']);
    exit;
  }

  // 🔒 禁止刪除最高權限帳號
  if (strtolower($target['role']) === 'admin') {
    echo json_encode(['success' => false, 'error' => '最高權限帳號不可刪除']);
    exit;
  }

  // ✅ 禁止刪除自己
  if (isset($_SESSION['admin_user']['id']) && $_SESSION['admin_user']['id'] == $id) {
    echo json_encode(['success' => false, 'error' => '⚠️ 無法刪除自己的帳號']);
    exit;
  }

  $conn->beginTransaction();

  $role = strtolower($target['role']);
  $fullName = $target['full_name'];

  // ✅ 根據角色刪除對應資料
  if ($role === 'badmin') {
    // 刪除 business_list 中同名業務資料
    $delBiz = $conn->prepare("DELETE FROM business_list WHERE name = :name");
    $delBiz->execute([':name' => $fullName]);
  } elseif ($role === 'gadmin') {
    // 刪除 agent_list 中同名代理商資料
    $delAgent = $conn->prepare("DELETE FROM agent_list WHERE name = :name");
    $delAgent->execute([':name' => $fullName]);
  }

  // ✅ 刪除帳號本身
  $stmt = $conn->prepare("DELETE FROM admin_list WHERE id = :id");
  $stmt->execute([':id' => $id]);

  $conn->commit();

  echo json_encode(['success' => true, 'message' => '✅ 帳號與相關資料刪除成功']);
} catch (Exception $e) {
  if ($conn && $conn->inTransaction()) $conn->rollBack();
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
