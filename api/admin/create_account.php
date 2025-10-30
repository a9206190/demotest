<?php
// ==================================================
// create_account.php — 建立帳號
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();

  $data = json_decode(file_get_contents('php://input'), true);
  $username  = trim($data['username'] ?? '');
  $password  = trim($data['password'] ?? '');
  $full_name = trim($data['full_name'] ?? '');
  $role      = trim($data['role'] ?? 'BAdmin');
  $status    = 'active';

  if (!$username || !$full_name) {
    echo json_encode(['success' => false, 'error' => '帳號與姓名不得為空']);
    exit;
  }

  if ($role === 'BAdmin' || $role === 'GAdmin') {
    $password = '123456';
  } elseif (!$password) {
    echo json_encode(['success' => false, 'error' => '請輸入密碼']);
    exit;
  }

  $hash = password_hash($password, PASSWORD_BCRYPT);

  // === 產生唯一代碼 ===
  function generateReferralCode($conn, $table) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    do {
      $code = '';
      for ($i = 0; $i < 6; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
      }
      $check = $conn->prepare("SELECT COUNT(*) FROM {$table} WHERE referral_code = :c");
      $check->execute([':c' => $code]);
    } while ($check->fetchColumn() > 0);
    return $code;
  }

  function generateUniqueID($conn, $table, $field) {
    do {
      $id = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
      $check = $conn->prepare("SELECT COUNT(*) FROM {$table} WHERE {$field} = :id");
      $check->execute([':id' => $id]);
    } while ($check->fetchColumn() > 0);
    return $id;
  }

  $check = $conn->prepare("SELECT COUNT(*) FROM admin_list WHERE username = :u");
  $check->execute([':u' => $username]);
  if ($check->fetchColumn() > 0) {
    echo json_encode(['success' => false, 'error' => '帳號已存在']);
    exit;
  }

  $conn->beginTransaction();

  $linked_id = null;
  $referral_code = null;

  // ==================================================
  // 1️⃣ 寫入 admin_list
  // ==================================================
  $stmt = $conn->prepare("
    INSERT INTO admin_list (username, full_name, password_hash, role, status, created_at)
    VALUES (:u, :f, :p, :r, :s, CURRENT_TIMESTAMP)
  ");
  $stmt->execute([
    ':u' => $username,
    ':f' => $full_name,
    ':p' => $hash,
    ':r' => $role,
    ':s' => $status
  ]);

  // ==================================================
  // 2️⃣ 若為 BAdmin → 同步新增 business_list
  // ==================================================
  if ($role === 'BAdmin') {
    $linked_id = generateUniqueID($conn, 'business_list', 'business_id');
    $referral_code = generateReferralCode($conn, 'business_list');

    // ⚠️ 不插入 referral_url（讓 MySQL 自動生成）
    $stmt2 = $conn->prepare("
      INSERT INTO business_list (business_id, name, phone, email, line_id, referral_code, status, created_at)
      VALUES (:id, :name, '', '', '', :ref, '啟用', CURRENT_TIMESTAMP)
    ");
    $stmt2->execute([
      ':id' => $linked_id,
      ':name' => $full_name,
      ':ref' => $referral_code
    ]);
  }

  // ==================================================
  // 3️⃣ 若為 GAdmin → 同步新增 agent_list
  // ==================================================
  if ($role === 'GAdmin') {
    $linked_id = generateUniqueID($conn, 'agent_list', 'agent_id');
    $referral_code = generateReferralCode($conn, 'agent_list');

    // ⚠️ 不插入 referral_url（讓 MySQL 自動生成）
    $stmt3 = $conn->prepare("
      INSERT INTO agent_list (agent_id, name, phone, email, line_id, referral_code, password_hash, status, created_at)
      VALUES (:id, :name, '', '', '', :ref, :pw, '啟用', CURRENT_TIMESTAMP)
    ");
    $stmt3->execute([
      ':id' => $linked_id,
      ':name' => $full_name,
      ':ref' => $referral_code,
      ':pw' => $hash
    ]);
  }

  $conn->commit();

  echo json_encode([
    'success' => true,
    'message' => '帳號建立成功',
    'role' => $role,
    'linked_id' => $linked_id,
    'referral_code' => $referral_code,
    'referral_url' => "https://moneyfast.cc/loan?" . ($role === 'BAdmin' ? "ref=" : "agent=") . $referral_code,
    'default_password' => ($role === 'BAdmin' || $role === 'GAdmin') ? '123456' : $password
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
  if ($conn && $conn->inTransaction()) $conn->rollBack();
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
