<?php
// ==================================================
// get_loan.php — 後台查詢所有申貸資料（統一 Session / CORS / 安全版）
// ==================================================

// === 啟用錯誤記錄（不輸出 HTML） ===
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/get_loan_error.log');
error_reporting(E_ALL);

// ==================================================
// 🔹 導入統一 Session 模組（根目錄的 init_session.php）
// ==================================================
$initPath = __DIR__ . '/init_session.php';               // 嘗試同層
if (!file_exists($initPath)) $initPath = __DIR__ . '/../init_session.php'; // 嘗試上層
if (!file_exists($initPath)) $initPath = __DIR__ . '/../../admin/init_session.php'; // ✅ 根目錄 /api/admin/init_session.php
if (!file_exists($initPath)) {
  echo json_encode(['success' => false, 'error' => '找不到 init_session.php']);
  exit;
}
require_once $initPath;

// ==================================================
// 驗證登入狀態（統一使用 $_SESSION['user']）
// ==================================================
if (empty($_SESSION['user'])) {
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
    throw new Exception('資料庫連線失敗');
  }

  // ==================================================
  // 撈取所有申貸資料（完整欄位 + 排序）
  // ==================================================
  $sql = "
    SELECT
      id,
      application_no,
      name,
      phone,
      id_number,
      loan_status,
      apply_date,
      first_due_date,
      installment_count,
      installment_amount,
      schedule_json,
      contract_html,
      contract_date,
      sign_image_path,
      created_at,
      updated_at,
      line_id,
      dob,
      address_home,
      holder_home,
      address_residence,
      holder_residence,
      company_name,
      company_address,
      company_phone,
      job_title,
      salary,
      labor_insurance,
      work_years,
      credit_status,
      has_credit_card,
      has_bank_loan,
      has_financing_loan,
      has_personal_loan,
      debt_detail,
      contact1_name,
      contact1_relation,
      contact1_phone,
      contact2_name,
      contact2_relation,
      contact2_phone,
      step,
      status,
      note
    FROM loan_applications
    ORDER BY updated_at DESC
  ";

  $stmt = $conn->prepare($sql);
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // ==================================================
  // 處理資料（補空值、解析 JSON、解碼 HTML）
  // ==================================================
  foreach ($rows as &$r) {
    foreach ($r as $key => $val) {
      if ($val === null) $r[$key] = '';
    }

    $r['loan_status'] = $r['loan_status'] ?: '待審核';
    $r['step'] = (int)($r['step'] ?: 1);

    // ✅ 解析 schedule_json
    if (!empty($r['schedule_json'])) {
      $decoded = json_decode($r['schedule_json'], true);
      $r['schedule'] = is_array($decoded) ? $decoded : [];
    } else {
      $r['schedule'] = [];
    }

    // ✅ 解碼 HTML 合約內容
    if (!empty($r['contract_html'])) {
      $r['contract_html'] = html_entity_decode($r['contract_html']);
    }
  }

  // ==================================================
  // 回傳結果
  // ==================================================
  echo json_encode([
    'success' => true,
    'count' => count($rows),
    'data' => $rows
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  error_log('[ERROR get_loan.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage(),
    'line' => $e->getLine()
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
