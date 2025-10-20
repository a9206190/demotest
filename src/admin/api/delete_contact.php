<?php
// ==================================================
// ✅ delete_contact.php — 刪除聯絡紀錄
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

  if (!$id) {
    echo json_encode(["success" => false, "message" => "缺少 ID"]);
    exit;
  }

  $db = new Database();
  $conn = $db->getConnection();

  $stmt = $conn->prepare("DELETE FROM consult_requests WHERE id = :id");
  $stmt->execute([":id" => $id]);

  echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage(),
    "file" => $e->getFile(),
    "line" => $e->getLine(),
  ], JSON_UNESCAPED_UNICODE);
}
