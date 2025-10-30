<?php
// ==================================================
// delete_business_shift.php — 刪除指定業務排班
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Content-Type: application/json; charset=utf-8");

// === CORS 設定 ===
$allowed_origins = [
  "http://localhost:5173",
  "https://moneyfast.cc",
  "https://www.moneyfast.cc"
];
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

require_once __DIR__ . "/../../config/Database.php";

try {
  $db = new Database();
  $conn = $db->getConnection();

  $data = json_decode(file_get_contents("php://input"), true);
  $id = $data["id"] ?? null;

  if (!$id) {
    echo json_encode(["success" => false, "error" => "缺少排班 ID"]);
    exit;
  }

  // 檢查是否存在
  $check = $conn->prepare("SELECT id FROM business_shifts WHERE id = :id");
  $check->execute([":id" => $id]);
  if (!$check->fetch()) {
    echo json_encode(["success" => false, "error" => "找不到該排班"]);
    exit;
  }

  // 刪除紀錄
  $stmt = $conn->prepare("DELETE FROM business_shifts WHERE id = :id");
  $stmt->execute([":id" => $id]);

  echo json_encode(["success" => true, "message" => "刪除成功"]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>
