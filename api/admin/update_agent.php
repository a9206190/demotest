<?php
// ==================================================
// update_agent.php — 代理商更新個人資料（同步 admin_list 密碼）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/update_agent_error.log');
error_reporting(E_ALL);

// ==================================================
// PHP 相容性補強（for PHP < 8）
// ==================================================
if (!function_exists('str_contains')) {
  function str_contains($haystack, $needle) {
    return $needle !== '' && strpos($haystack, $needle) !== false;
  }
}

// ==================================================
// 環境偵測
// ==================================================
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$isHttps = $protocol === 'https';
$inDemo = str_contains(__DIR__, '/demo/');
$basePath = $inDemo ? '/demo/' : '/';
$cookieDomain = str_contains($host, 'moneyfast.cc') ? '.moneyfast.cc' : $host;

// ==================================================
// CORS 設定（統一三網域）
// ==================================================
$allowed_origins = [
  'http://localhost:5173',
  'https://moneyfast.cc',
  'https://www.moneyfast.cc'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// Session 安全設定（統一 check_session 架構）
// ==================================================
session_set_cookie_params([
  'lifetime' => 0,
  'path' => $basePath,
  'domain' => $cookieDomain,
  'secure' => $isHttps,
  'httponly' => true,
  'samesite' => 'None'
]);
session_start();

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // 驗證登入（僅允許代理商 GAdmin）
  // ==================================================
  $adminSession = $_SESSION['admin_user'] ?? null;
  if (!$adminSession || ($adminSession['role'] ?? '') !== 'GAdmin') {
    throw new Exception('未登入或非代理商帳號');
  }

  $admin_id = $adminSession['id'];
  $admin_username = $adminSession['username'];

  // ==================================================
  // 接收 JSON 資料
  // ==================================================
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if (!$data) throw new Exception('無效的輸入資料或 JSON 格式錯誤');

  $agent_id = trim($data['agent_id'] ?? '');
  $name = trim($data['name'] ?? '');
  $phone = trim($data['phone'] ?? '');
  $email = trim($data['email'] ?? '');
  $line_id = trim($data['line_id'] ?? '');
  $new_password = trim($data['new_password'] ?? '');

  if ($agent_id === '') throw new Exception('缺少 agent_id');

  // ==================================================
  // 動態欄位更新（只更新有值的欄位）
  // ==================================================
  $fields = [];
  $params = [':agent_id' => $agent_id];

  if ($name !== '') {
    $fields[] = 'name = :name';
    $params[':name'] = $name;
  }
  if ($phone !== '') {
    $fields[] = 'phone = :phone';
    $params[':phone'] = $phone;
  }
  if ($email !== '') {
    $fields[] = 'email = :email';
    $params[':email'] = $email;
  }
  if ($line_id !== '') {
    $fields[] = 'line_id = :line_id';
    $params[':line_id'] = $line_id;
  }

  if (!empty($fields)) {
    $fields[] = 'updated_at = NOW()';
    $sql = 'UPDATE agent_list SET ' . implode(', ', $fields) . ' WHERE agent_id = :agent_id';
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
  }

  // ==================================================
  // 若有新密碼 → 同步更新 admin_list + agent_list
  // ==================================================
  if ($new_password !== '') {
    $hash = password_hash($new_password, PASSWORD_BCRYPT);

    $stmt1 = $conn->prepare('UPDATE agent_list SET password_hash = :pw WHERE agent_id = :agent_id');
    $stmt1->execute([':pw' => $hash, ':agent_id' => $agent_id]);

    $stmt2 = $conn->prepare('UPDATE admin_list SET password_hash = :pw WHERE id = :id');
    $stmt2->execute([':pw' => $hash, ':id' => $admin_id]);
  }

  // ==================================================
  // 查詢更新後資料
  // ==================================================
  $fetch = $conn->prepare("
    SELECT 
      agent_id, name, phone, email, line_id,
      referral_code, referral_url,
      customer_count, referral_count, updated_at
    FROM agent_list
    WHERE agent_id = :agent_id
  ");
  $fetch->execute([':agent_id' => $agent_id]);
  $updated = $fetch->fetch(PDO::FETCH_ASSOC);

  if (!$updated) throw new Exception("更新後查無代理商資料 (agent_id=$agent_id)");

  // ==================================================
  // 回傳結果
  // ==================================================
  echo json_encode([
    'success' => true,
    'message' => $new_password ? '✅ 資料與密碼已同步更新' : '✅ 資料更新成功',
    'data' => $updated
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  http_response_code(500);
  error_log('[update_agent.php] ' . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
