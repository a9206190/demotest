<?php
// ============================
// consult_submit.php（MySQL PDO 版本）
// ============================

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ✅ 處理 preflight 請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/Database.php';

try {
    // ✅ 解析前端傳來的 JSON
    $input = json_decode(file_get_contents('php://input'), true);
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');

    // ✅ 驗證輸入
    if ($name === '' || $phone === '') {
        echo json_encode([
            'success' => false,
            'message' => '請輸入完整資料'
        ]);
        exit;
    }

    // ✅ 建立資料庫連線
    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        throw new Exception("無法連線至資料庫");
    }

    // ✅ 插入資料（使用 prepared statement 防 SQL injection）
    $sql = "
        INSERT INTO consult_requests (name, phone, status, created_at)
        VALUES (:name, :phone, '未聯繫', NOW())
    ";
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':name' => $name,
        ':phone' => $phone
    ]);

    // ✅ 成功回應
    echo json_encode([
        'success' => true,
        'message' => '資料已成功新增（預設狀態：未聯繫）'
    ]);

} catch (PDOException $e) {
    // ✅ 捕捉資料庫錯誤
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '資料庫錯誤：' . $e->getMessage()
    ]);
} catch (Exception $e) {
    // ✅ 捕捉其他例外
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '系統錯誤：' . $e->getMessage()
    ]);
}
?>
