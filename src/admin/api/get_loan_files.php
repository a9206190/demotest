<?php
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/Database.php';

$id = $_GET['id'] ?? '';
$type = $_GET['type'] ?? ''; // 可選：signature, id_front, bankbook, selfie 等

if (!$id || !is_numeric($id)) {
  echo json_encode(["success" => false, "message" => "參數錯誤"]);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  // === 撈取該申請的所有上傳檔案 ===
  $sql = "
    SELECT 
      id,
      application_id,
      file_type,
      file_path,
      uploaded_at
    FROM loan_application_files
    WHERE application_id = :id
  ";
  if ($type) $sql .= " AND file_type = :type";
  $sql .= " ORDER BY uploaded_at DESC";

  $stmt = $conn->prepare($sql);
  $params = [':id' => $id];
  if ($type) $params[':type'] = $type;
  $stmt->execute($params);

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // === 格式化 ===
  foreach ($rows as &$r) {
    $r['file_path'] = str_replace('\\', '/', $r['file_path']);
    $r['file_type'] = $r['file_type'] ?? '';
    $r['uploaded_at'] = $r['uploaded_at'] ?? '';
  }

  echo json_encode([
    "success" => true,
    "data" => $rows
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode([
    "success" => false,
    "message" => $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
