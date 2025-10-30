<?php
// ==================================================
// update_account.php — 管理員帳號更新（統一 Session / 安全 / 禁止修改最高權限）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/update_account_error.log');
error_reporting(E_ALL);

// ==================================================
// PHP 相容性補強（避免舊版無 str_contains）
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
$inDemo = str_contains(__DIR__, '/demo/');
$basePath = $inDemo ? '/demo/' : '/';

// ==================================================
// CORS 設定（固定三網域）
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
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ==================================================
// Session 安全設定（統一 check_session 架構）
// ==================================================
$isHttps = ($protocol === 'https');
session_set_cookie_params([
  'lifetime' => 0,
  'path' => $basePath,
  'domain' => $host,
  'secure' => $isHttps,
  'httponly' => true,
  'samesite' => 'None'
]);
session_start();

// ==================================================
// 登入驗證
// ==================================================
if (empty($_SESSION['admin_user'])) {
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

// ==================================================
// 引入資料庫
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception('資料庫連線失敗');

  // ==================================================
  // 接收參數
  // ==================================================
  $data = json_decode(file_get_contents('php://input'), true);
  $id = $data['id'] ?? null;
  $username = trim($data['username'] ?? '');
  $full_name = trim($data['full_name'] ?? '');
  $role = trim($data['role'] ?? '');
  $status = trim($data['status'] ?? 'active');
  $new_password = trim($data['new_password'] ?? '');

  if (!$id || !$username || !$full_name || !$role) {
    echo json_encode(['success' => false, 'error' => '缺少必要欄位']);
    exit;
  }

  // ==================================================
  // 🔒 禁止修改最高權限帳號
  // ==================================================
  $checkRole = $conn->prepare("SELECT role FROM admin_list WHERE id = :id");
  $checkRole->execute([':id' => $id]);
  $target = $checkRole->fetch(PDO::FETCH_ASSOC);

  if (!$target) {
    echo json_encode(['success' => false, 'error' => '帳號不存在']);
    exit;
  }

  if (strtolower($target['role']) === 'admin') {
    echo json_encode(['success' => false, 'error' => '最高權限帳號不可修改']);
    exit;
  }

  // ==================================================
  // ✅ 檢查帳號名稱是否重複
  // ==================================================
  $check = $conn->prepare("SELECT id FROM admin_list WHERE username = :u AND id != :id");
  $check->execute([':u' => $username, ':id' => $id]);
  if ($check->fetch()) {
    echo json_encode(['success' => false, 'error' => '帳號名稱已被使用']);
    exit;
  }

  // ==================================================
  // ✅ 若有輸入新密碼 → 重新加密
  // ==================================================
  if ($new_password !== '') {
    $hash = password_hash($new_password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare("
      UPDATE admin_list
      SET username = :u, full_name = :f, role = :r, status = :s, password_hash = :p, updated_at = NOW()
      WHERE id = :id
    ");
    $stmt->execute([
      ':u' => $username,
      ':f' => $full_name,
      ':r' => $role,
      ':s' => $status,
      ':p' => $hash,
      ':id' => $id
    ]);
  } else {
    $stmt = $conn->prepare("
      UPDATE admin_list
      SET username = :u, full_name = :f, role = :r, status = :s, updated_at = NOW()
      WHERE id = :id
    ");
    $stmt->execute([
      ':u' => $username,
      ':f' => $full_name,
      ':r' => $role,
      ':s' => $status,
      ':id' => $id
    ]);
  }

  echo json_encode(['success' => true, 'message' => '帳號更新成功'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  error_log('[ERROR update_account.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
