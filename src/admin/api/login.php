<?php
// ==================================================
// ✅ login.php — React 登入 API（含跨域 Session）
// ==================================================
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

ini_set('display_errors', 1);
error_reporting(E_ALL);

// ✅ 允許跨域存取 Cookie
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', 'false'); // 如果是 HTTPS 改成 true
session_start();


require_once __DIR__ . '/../../../config/Database.php';

// ==================================================
// 0️⃣ 建立資料庫連線
// ==================================================
$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
  echo json_encode(['success' => false, 'error' => '資料庫連線失敗']);
  exit;
}

// ==================================================
// 1️⃣ 接收登入資料
// ==================================================
$data = json_decode(file_get_contents('php://input'), true);
$username = trim($data['username'] ?? '');
$password = trim($data['password'] ?? '');

if ($username === '' || $password === '') {
  echo json_encode(['success' => false, 'error' => '請輸入帳號與密碼']);
  exit;
}

// ==================================================
// 2️⃣ 查詢帳號
// ==================================================
try {
  $sql = "SELECT id, username, full_name, password_hash, role, status 
          FROM admin_list 
          WHERE username = :u 
          LIMIT 1";
  $stmt = $conn->prepare($sql);
  $stmt->execute([':u' => $username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    echo json_encode(['success' => false, 'error' => '查無此帳號']);
    exit;
  }

  if ($user['status'] !== 'active') {
    echo json_encode(['success' => false, 'error' => '帳號未啟用或已停用']);
    exit;
  }

  if (!password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'error' => '帳號或密碼錯誤']);
    exit;
  }

  // ==================================================
  // ✅ 建立 Session
  // ==================================================
  $_SESSION['admin_user'] = [
    'id' => $user['id'],
    'username' => $user['username'],
    'name' => $user['full_name'],
    'role' => $user['role']
  ];

  // ==================================================
  // ✅ 回傳 React 導向資訊
  // ==================================================
  switch ($user['role']) {
    case 'Admin':   $redirect = '/admin/dashboard'; break;
    case 'SAdmin':  $redirect = '/admin/sadmin'; break;
    case 'BAdmin':  $redirect = '/admin/business'; break;
    case 'GAdmin':  $redirect = '/admin/agent'; break;
    default:        $redirect = '/admin/login'; break;
  }

  echo json_encode([
    'success' => true,
    'message' => '登入成功',
    'user' => [
      'id' => $user['id'],
      'username' => $user['username'],
      'name' => $user['full_name'],
      'role' => $user['role']
    ],
    'redirect' => $redirect
  ]);
  exit;

} catch (Exception $e) {
  echo json_encode(['success' => false, 'error' => '伺服器錯誤：' . $e->getMessage()]);
}
