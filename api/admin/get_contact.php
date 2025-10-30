<?php
// ==================================================
// get_contact.php — 後台聯絡紀錄列表（統一 Session + CORS + Debug Header）
// ==================================================

// === 啟用除錯（僅開發階段） ===
ini_set('display_errors', 1);
error_reporting(E_ALL);

// === 引入統一 Session 初始化 ===
require_once __DIR__ . '/init_session.php';

// === 安全 Debug 輸出（Header 模式，不破壞 JSON） ===
function js_log($msg) {
  $isLocal = str_contains($_SERVER['HTTP_HOST'] ?? '', 'localhost');
  $isAdmin = isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'Admin';
  if ($isLocal || $isAdmin) {
    header('X-Debug-Log: ' . substr(json_encode($msg, JSON_UNESCAPED_UNICODE), 0, 900));
  }
}

// ==================================================
// 驗證登入狀態
// ==================================================
if (empty($_SESSION['user'])) {
  js_log("❌ 未登入或登入已過期");
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

$user = $_SESSION['user'];
js_log(['✅ 登入身份' => $user['role'], '使用者' => $user['name'] ?? $user['username'] ?? '未知']);

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();

  if (!$conn) {
    js_log("❌ 資料庫連線失敗");
    echo json_encode(['success' => false, 'error' => '資料庫連線失敗']);
    exit;
  }

  js_log("✅ DB Connected");

  // ==================================================
  // 查詢聯絡紀錄
  // ==================================================
  $sql = "
    SELECT 
      id,
      name,
      phone,
      COALESCE(status, '未聯繫') AS status,
      COALESCE(contact_note, '') AS contact_note,
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM consult_requests
    ORDER BY created_at DESC
  ";

  $stmt = $conn->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  js_log(['✅ 查詢完成，筆數' => count($rows)]);

  echo json_encode([
    'success' => true,
    'count' => count($rows),
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  js_log(['❌ SQL 錯誤' => $e->getMessage(), 'line' => $e->getLine()]);
  error_log('[ERROR get_contact.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
