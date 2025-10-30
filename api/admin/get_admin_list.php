<?php
// ==================================================
// get_admin_list.php — 管理員列表 API（含業務與代理商關聯）
// ✅ 使用 init_session.php 統一 Session 機制 + 安全調試模式
// ==================================================

// === 啟用除錯（僅開發階段） ===
ini_set('display_errors', 1);
error_reporting(E_ALL);

// === 導入 Session 初始化 ===
require_once __DIR__ . '/init_session.php';

// === Console 調試工具 ===
function js_log($msg) {
  $isLocal = str_contains($_SERVER['HTTP_HOST'] ?? '', 'localhost');
  $isAdmin = isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'Admin';
  if ($isLocal || $isAdmin) {
    header('X-Debug-Log: ' . substr(json_encode($msg, JSON_UNESCAPED_UNICODE), 0, 900));
  }
}


// === Debug：印出 session 狀態 ===
js_log(['Session_User' => $_SESSION['user'] ?? null]);

// ==================================================
// 驗證登入狀態
// ==================================================
if (empty($_SESSION['user'])) {
  js_log("❌ 未登入或登入已過期");
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();

  if (!$conn) {
    js_log("❌ DB連線失敗");
    echo json_encode(['success' => false, 'error' => '資料庫連線失敗']);
    exit;
  }

  js_log("✅ DB Connected");

  // ==================================================
  // 搜尋條件
  // ==================================================
  $keyword = trim($_GET['search'] ?? '');
  js_log("搜尋關鍵字: " . $keyword);

  // ==================================================
  // 核心查詢
  // ==================================================
  $sql = "
    SELECT 
      a.id,
      a.username,
      a.full_name,
      a.role,
      a.status,
      a.last_login,
      a.created_at,
      b.business_id,
      b.referral_code AS business_referral,
      g.agent_id,
      g.referral_code AS agent_referral
    FROM admin_list a
    LEFT JOIN business_list b 
      ON a.role = 'BAdmin' AND a.full_name = b.name
    LEFT JOIN agent_list g 
      ON a.role = 'GAdmin' AND a.full_name = g.name
  ";

  if ($keyword !== '') {
    $sql .= " WHERE a.username LIKE :kw OR a.full_name LIKE :kw ";
  }

  $sql .= " ORDER BY a.id ASC";

  js_log("SQL 查詢：" . $sql);

  $stmt = $conn->prepare($sql);
  if ($keyword !== '') {
    $stmt->execute([':kw' => "%$keyword%"]);
  } else {
    $stmt->execute();
  }

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  js_log(['查詢結果筆數' => count($rows)]);

  // ==================================================
  // 整理輸出資料
  // ==================================================
  foreach ($rows as &$r) {
    $role = strtolower($r['role']);
    if ($role === 'badmin') {
      $r['uid'] = $r['business_id'];
      $r['referral_code'] = $r['business_referral'];
    } elseif ($role === 'gadmin') {
      $r['uid'] = $r['agent_id'];
      $r['referral_code'] = $r['agent_referral'];
    } else {
      $r['uid'] = null;
      $r['referral_code'] = null;
    }

    // 🔒 Admin 無法刪除
    $r['locked'] = $role === 'admin';
  }

  js_log("✅ 整理完成，回傳 JSON");

  echo json_encode([
    'success' => true,
    'count' => count($rows),
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  js_log(['❌ 伺服器錯誤' => $e->getMessage(), 'line' => $e->getLine()]);
  http_response_code(500);
  error_log("get_admin_list Error: " . $e->getMessage());
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
