<?php
// ==================================================
// export_all_excel.php — 匯出所有貸款申請資料
// ==================================================

// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

require_once __DIR__ . '/../../config/Database.php';

// ✅ 檢查 SimpleXLSXGen 是否存在
$xlsxLib = __DIR__ . '/../../lib/SimpleXLSXGen.php';
if (!file_exists($xlsxLib)) {
  http_response_code(500);
  die(json_encode([
    "success" => false,
    "error" => "找不到 SimpleXLSXGen.php，請確認 lib 目錄中存在該檔案"
  ], JSON_UNESCAPED_UNICODE));
}
require_once $xlsxLib;

use Shuchkin\SimpleXLSXGen;

try {
  $db = new Database();
  $conn = $db->getConnection();

  // 取得所有申請資料
  $stmt = $conn->query("SELECT * FROM loan_applications ORDER BY id DESC");
  $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (!$data) {
    http_response_code(404);
    die("目前沒有申請資料。");
  }

  // ✅ 欄位中英文對照
  $headers = [
    "id" => "編號",
    "application_no" => "申請編號",
    "name" => "姓名",
    "phone" => "電話",
    "id_number" => "身分證字號",
    "dob" => "出生日期",
    "address_home" => "戶籍地址",
    "holder_home" => "戶籍持有人",
    "address_residence" => "現居地址",
    "holder_residence" => "現居持有人",
    "company_name" => "公司名稱",
    "company_address" => "公司地址",
    "company_phone" => "公司電話",
    "job_title" => "職稱",
    "salary" => "薪資",
    "labor_insurance" => "勞保狀況",
    "work_years" => "年資",
    "credit_status" => "信用狀況",
    "has_credit_card" => "是否有信用卡",
    "has_bank_loan" => "銀行貸款",
    "has_financing_loan" => "融資貸款",
    "has_personal_loan" => "個人信貸",
    "debt_detail" => "債務明細",
    "contact1_name" => "聯絡人1姓名",
    "contact1_relation" => "聯絡人1關係",
    "contact1_phone" => "聯絡人1電話",
    "contact2_name" => "聯絡人2姓名",
    "contact2_relation" => "聯絡人2關係",
    "contact2_phone" => "聯絡人2電話",
    "loan_status" => "貸款狀態",
    "note" => "備註",
    "apply_date" => "申請日期",
    "created_at" => "建立時間",
    "updated_at" => "更新時間"
  ];

  // ✅ 組成 Excel 表格內容
  $rows = [array_values($headers)];
  foreach ($data as $row) {
    $rows[] = array_map(function ($key) use ($row) {
      return $row[$key] ?? "";
    }, array_keys($headers));
  }

  // ✅ 生成 Excel 檔
  $xlsx = SimpleXLSXGen::fromArray($rows);
  $filename = "LoanApplications_All_" . date("Ymd_His") . ".xlsx";
  $xlsx->downloadAs($filename);
  exit;

} catch (Throwable $e) {
  http_response_code(500);
  die(json_encode([
    "success" => false,
    "error" => $e->getMessage()
  ], JSON_UNESCAPED_UNICODE));
}
