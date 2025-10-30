<?php
// ==================================================
// delete_file.php — 刪除檔案（含 JSON 陣列支援）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . '/../../config/Database.php';

$data = json_decode(file_get_contents("php://input"), true);
$id = intval($data["id"] ?? 0);
$type = $data["type"] ?? "";
$subIndex = isset($data["subIndex"]) ? intval($data["subIndex"]) : null;

if (!$id || !$type) {
  echo json_encode(["success" => false, "error" => "缺少必要參數"]);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  if ($type === "admin_attachment") {
    $stmt = $conn->prepare("
      SELECT id, admin_file_path 
      FROM loan_application_files 
      WHERE id = :id AND file_type = 'admin_attachment' LIMIT 1
    ");
    $stmt->execute([":id" => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
      $list = json_decode($row["admin_file_path"], true) ?: [];
      if (isset($list[$subIndex])) {
        $targetPath = __DIR__ . '/../../../' . $list[$subIndex]["path"];
        if (file_exists($targetPath)) @unlink($targetPath);
        unset($list[$subIndex]);
        $list = array_values($list);

        if (empty($list)) {
          $conn->prepare("DELETE FROM loan_application_files WHERE id = :id")->execute([":id" => $row["id"]]);
        } else {
          $update = $conn->prepare("
            UPDATE loan_application_files 
            SET admin_file_path = :json 
            WHERE id = :sid
          ");
          $update->execute([
            ":json" => json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ":sid" => $row["id"]
          ]);
        }
      }
    }
  } else {
    $stmt = $conn->prepare("SELECT file_path FROM loan_application_files WHERE id = :id");
    $stmt->execute([":id" => $id]);
    $path = $stmt->fetchColumn();

    if ($path && file_exists(__DIR__ . '/../../../' . $path)) @unlink(__DIR__ . '/../../../' . $path);
    $conn->prepare("DELETE FROM loan_application_files WHERE id = :id")->execute([":id" => $id]);
  }

  echo json_encode(["success" => true]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
