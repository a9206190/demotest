<?php
// ==================================================
// ✅ get_admin_stats.php — 後台 Dashboard API（最終修正版）
// ==================================================

// === 基本設定 ===
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: http://localhost:5173"); // ⚠️ React 是 5173；若你用 3000 請改這裡
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// === 顯示錯誤（開發階段用） ===
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// === 啟用 Session ===
ini_set('session.cookie_secure', 'false');
session_start();

require_once __DIR__ . '/../../../config/Database.php';

try {
  // ✅ 驗證登入狀態
  if (!isset($_SESSION['admin_user'])) {
    echo json_encode(['success' => false, 'error' => '未登入']);
    exit;
  }

  // ✅ 資料庫連線
  $db = new Database();
  $conn = $db->getConnection();

  // ✅ 統計各狀態筆數
  $stats = [
    'total'    => $conn->query("SELECT COUNT(*) FROM loan_applications")->fetchColumn(),
    'pending'  => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE status = 'pending'")->fetchColumn(),
    'approved' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE status = 'approved'")->fetchColumn(),
    'rejected' => $conn->query("SELECT COUNT(*) FROM loan_applications WHERE status = 'rejected'")->fetchColumn(),
  ];

  // ✅ 撈出最近 5 筆申請
  $stmt = $conn->query("
    SELECT id, name, installment_amount AS loan_amount, status, created_at
    FROM loan_applications
    ORDER BY created_at DESC
    LIMIT 5
  ");
  $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // ✅ 回傳 JSON
  echo json_encode([
    'success' => true,
    'user' => $_SESSION['admin_user'],
    'stats' => $stats,
    'recent' => $recent
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  // ✅ 統一錯誤輸出（避免 HTML）
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'file' => $e->getFile(),
    'line' => $e->getLine(),
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
  