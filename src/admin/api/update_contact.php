<?php
// ==================================================
// ✅ update_contact.php — 更新聯繫狀態與內容 + 即時回傳最新資料
// ==================================================
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

require_once __DIR__ . "/../../../config/Database.php";

try {
  $input = json_decode(file_get_contents("php://input"), true);
  $id = $input["id"] ?? "";
  $status = $input["status"] ?? "";
  $note = $input["contact_note"] ?? "";

  if (!$id) {
    echo json_encode(["success" => false, "message" => "缺少 ID"]);
    exit;
  }

  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 更新紀錄
  $stmt = $conn->prepare("
    UPDATE consult_requests
    SET status = :status, contact_note = :note
    WHERE id = :id
  ");
  $stmt->execute([
    ":status" => $status ?: "未聯繫",
    ":note" => $note,
    ":id" => $id,
  ]);

  // ✅ 查詢更新後的最新資料
  $stmt2 = $conn->prepare("
    SELECT 
      id, name, phone,
      COALESCE(status, '未聯繫') AS status,
      COALESCE(contact_note, '') AS contact_note,
      TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
    FROM consult_requests
    WHERE id = :id
  ");
  $stmt2->execute([":id" => $id]);
  $updated = $stmt2->fetch(PDO::FETCH_ASSOC);

  echo json_encode([
    "success" => true,
    "data" => $updated,
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage(),
    "file" => $e->getFile(),
    "line" => $e->getLine(),
  ], JSON_UNESCAPED_UNICODE);
}
