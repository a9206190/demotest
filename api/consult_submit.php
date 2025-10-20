<?php
// ============================
// consult_submit.php
// ============================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');  // ✅ 加上 OPTIONS
header('Access-Control-Allow-Headers: Content-Type');
// ✅ 處理 preflight 請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/Database.php';

try {
    // 取得前端送來的 JSON
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if ($name === '' || $phone === '') {
        echo json_encode(['success' => false, 'message' => '請輸入完整資料']);
        exit;
    }

    // 連線資料庫
    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        throw new Exception("無法連線到資料庫");
    }

    // ✅ 插入資料時加上 status 欄位，預設為「未聯繫」
    $stmt = $conn->prepare("
        INSERT INTO consult_requests (name, phone, status, created_at)
        VALUES (:name, :phone, '未聯繫', NOW())
    ");
    $stmt->execute([
        ':name' => $name,
        ':phone' => $phone
    ]);

    echo json_encode(['success' => true, 'message' => '資料已成功新增（預設狀態：未聯繫）']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '❌ 系統錯誤：' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
