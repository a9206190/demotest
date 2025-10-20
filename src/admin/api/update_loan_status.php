<?php
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/Database.php';

$input = json_decode(file_get_contents("php://input"), true);
$id = $input['id'] ?? '';
$loan_status = $input['loan_status'] ?? '';
$note = $input['note'] ?? '';

$valid_status = [
  "待審核", "已核准", "已拒絕", "已取消",
  "逾期未付", "逾期已付", "已結清"
];

if (!$id || !in_array($loan_status, $valid_status)) {
  echo json_encode(["success" => false, "message" => "狀態無效"]);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  $stmt = $conn->prepare("
    UPDATE loan_applications
    SET loan_status = :loan_status,
        note = :note,
        updated_at = NOW()
    WHERE id = :id
  ");
  $stmt->execute([
    ':id' => $id,
    ':loan_status' => $loan_status,
    ':note' => $note,
  ]);

  echo json_encode(["success" => true]);
} catch (Exception $e) {
  echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
