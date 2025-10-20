<?php
// ==================================================
// ✅ get_contact.php — 後台聯絡紀錄列表
// ==================================================

// === 基本設定 ===
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173"); // ⚠️ 改成你的 React port
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");

// === 處理預檢請求 (CORS Preflight) ===
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

// === 載入資料庫 ===
require_once __DIR__ . "/../../../config/Database.php";

try {
  // ✅ 連線資料庫
  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 查詢資料（包含聯繫內容 contact_note）
  $sql = "
    SELECT 
      id, 
      name, 
      phone, 
      COALESCE(status, '未聯繫') AS status, 
      COALESCE(contact_note, '') AS contact_note, 
      TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM consult_requests
    ORDER BY created_at DESC
  ";
  $stmt = $conn->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // ✅ 回傳 JSON
  echo json_encode([
    "success" => true,
    "data" => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  // ❌ 錯誤處理 (防止回傳 HTML)
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "error" => "伺服器錯誤：" . $e->getMessage(),
    "file" => $e->getFile(),
    "line" => $e->getLine()
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
?>
