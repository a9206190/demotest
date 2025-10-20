<?php
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/Database.php';

$input = json_decode(file_get_contents("php://input"), true);
$id = $input['id'] ?? '';

if (!$id || !is_numeric($id)) {
  echo json_encode(["success" => false, "message" => "參數錯誤"]);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  $stmt = $conn->prepare("DELETE FROM loan_applications WHERE id = :id");
  $stmt->execute([':id' => $id]);

  echo json_encode(["success" => true]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
