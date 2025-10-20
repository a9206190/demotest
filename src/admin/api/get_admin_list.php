<?php
// =============================
// get_admin_list.php
// =============================

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../../config/Database.php';

try {
  // ✅ 建立資料庫連線
  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 取得搜尋關鍵字（前端 GET ?search=）
  $keyword = trim($_GET['search'] ?? '');

  // ✅ 查詢資料
  if ($keyword !== '') {
    // 模糊搜尋帳號或姓名
    $stmt = $conn->prepare("
      SELECT id, username, full_name, role, status, last_login, created_at
      FROM admin_list
      WHERE username ILIKE :kw OR full_name ILIKE :kw
      ORDER BY id ASC
    ");
    $stmt->execute([':kw' => "%$keyword%"]);
  } else {
    // 全部資料
    $stmt = $conn->prepare("
      SELECT id, username, full_name, role, status, last_login, created_at
      FROM admin_list
      ORDER BY id ASC
    ");
    $stmt->execute();
  }

  // ✅ 取出資料
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['success' => true, 'data' => $rows]);
} catch (Exception $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
