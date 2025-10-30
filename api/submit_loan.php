<?php
// ======================================================
// submit_loan.php — React 前端對應版（支援 FormData + 圖片上傳 + 日誌強化）
// ======================================================

// === ✅ 改為統一使用 init_session 處理 CORS ===
require_once __DIR__ . '/admin/init_session.php';

// === 錯誤設定 ===
ini_set("display_errors", 0);
ini_set("log_errors", 1);

// ✅ 確保 logs 目錄存在
$logDir = __DIR__ . "/../logs";
if (!is_dir($logDir)) {
  mkdir($logDir, 0777, true);
}

ini_set("error_log", $logDir . "/submit_loan_error.log");
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/../config/Database.php';

// === 建立資料庫連線 ===
try {
  $db = new Database();
  $conn = $db->getConnection();
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(["error" => "資料庫連線失敗：" . $e->getMessage()], JSON_UNESCAPED_UNICODE);
  exit;
}

// === 判斷 multipart/form-data ===
$isMultipart = isset($_SERVER["CONTENT_TYPE"]) && str_contains($_SERVER["CONTENT_TYPE"], "multipart/form-data");
$data = $isMultipart ? $_POST : json_decode(file_get_contents("php://input"), true);

// ✅ 如果是 multipart/form-data，但 $_POST 為空，仍繼續（允許純檔案上傳）
if ($isMultipart && empty($_POST) && !empty($_FILES)) {
  $data = []; // 建立空陣列防止 false
}

if (empty($data) && empty($_FILES)) {
  http_response_code(400);
  echo json_encode(["error" => "無效的資料格式（未收到任何欄位或檔案）"], JSON_UNESCAPED_UNICODE);
  exit;
}


// ======================================================
// 🔹 接收推薦碼與初始設定
// ======================================================
$referral_code = trim($data["referral_code"] ?? $data["referralCode"] ?? "");
$agent_id = null;
$business_id = null;
$referral_source = "自動分派";

// ======================================================
// 🔹 產生申請編號：YYYYMMDD + 電話號碼
// ======================================================
function generateApplicationNo($phone) {
  $date = date("Ymd");
  $cleanPhone = preg_replace("/\D/", "", $phone);
  $cleanPhone = str_pad($cleanPhone, 10, "0", STR_PAD_LEFT);
  return $date . $cleanPhone;
}
$application_no = generateApplicationNo($data["phone"] ?? "");

// ======================================================
// 🔹 依推薦碼比對來源
// ======================================================
if ($referral_code !== "") {
  $stmtA = $conn->prepare("SELECT agent_id FROM agent_list WHERE referral_code = :code LIMIT 1");
  $stmtA->execute([":code" => $referral_code]);
  $agent_id = $stmtA->fetchColumn();

  if ($agent_id) {
    $referral_source = "代理推薦";
  } else {
    $stmtB = $conn->prepare("SELECT business_id FROM business_list WHERE referral_code = :code LIMIT 1");
    $stmtB->execute([":code" => $referral_code]);
    $business_id = $stmtB->fetchColumn();
    if ($business_id) $referral_source = "業務直推";
  }
}

// ======================================================
// 🔹 決定班別（早/午/晚）
// ======================================================
$hour = (int)date("H");
$shift = ($hour >= 0 && $hour < 8) ? "晚班" : (($hour >= 8 && $hour < 16) ? "早班" : "午班");
$today = date("Y-m-d");

if ($agent_id && !$business_id) {
  $stmtBiz = $conn->prepare("
    SELECT business_id FROM business_shifts 
    WHERE shift_date = :today AND work_shift = :shift 
    ORDER BY RAND() LIMIT 1
  ");
  $stmtBiz->execute([":today" => $today, ":shift" => $shift]);
  $business_id = $stmtBiz->fetchColumn() ?: null;
  if (!$business_id) $referral_source = "代理推薦（無當班業務）";
}

if (!$agent_id && !$business_id) {
  $stmtBiz = $conn->prepare("
    SELECT business_id FROM business_shifts 
    WHERE shift_date = :today AND work_shift = :shift 
    ORDER BY RAND() LIMIT 1
  ");
  $stmtBiz->execute([":today" => $today, ":shift" => $shift]);
  $business_id = $stmtBiz->fetchColumn() ?: null;
  $referral_source = $business_id ? "自動分派" : "自動分派（無當班業務）";
}

// ======================================================
// 🔹 檢查當天重複申請
// ======================================================
$phone = $data["phone"] ?? "";
$stmtCheck = $conn->prepare("
  SELECT COUNT(*) FROM loan_applications 
  WHERE phone = :phone AND DATE(apply_date) = CURDATE()
");
$stmtCheck->execute([":phone" => $phone]);
if ($stmtCheck->fetchColumn() > 0) {
  echo json_encode(["success" => false, "error" => "您今日已送出申請，請勿重複提交。"], JSON_UNESCAPED_UNICODE);
  exit;
}

// ======================================================
// 🔹 寫入 loan_applications
// ======================================================
try {
  $apply_date = date("Y-m-d");
  $first_due_date = date("Y-m-d", strtotime("+7 days"));
  $contract_date = $apply_date;

  $stmt = $conn->prepare("
    INSERT INTO loan_applications (
      application_no, name, phone, id_number, line_id, dob,
      address_home, holder_home, address_residence, holder_residence,
      company_name, company_address, company_phone, job_title, salary,
      labor_insurance, work_years, credit_status,
      has_credit_card, has_bank_loan, has_financing_loan, has_personal_loan,
      debt_detail,
      contact1_name, contact1_relation, contact1_phone,
      contact2_name, contact2_relation, contact2_phone,
      apply_date, first_due_date, installment_count, installment_amount,
      schedule_json, contract_date, loan_status, step,
      referral_code, agent_id, business_id
    ) VALUES (
      :application_no, :name, :phone, :id_number, :line_id, :dob,
      :address_home, :holder_home, :address_residence, :holder_residence,
      :company_name, :company_address, :company_phone, :job_title, :salary,
      :labor_insurance, :work_years, :credit_status,
      :has_credit_card, :has_bank_loan, :has_financing_loan, :has_personal_loan,
      :debt_detail,
      :contact1_name, :contact1_relation, :contact1_phone,
      :contact2_name, :contact2_relation, :contact2_phone,
      :apply_date, :first_due_date, 4, 0,
      '[]', :contract_date, '待審核', 6,
      :referral_code, :agent_id, :business_id
    )
  ");
  $stmt->execute([
    ":application_no" => $application_no,
    ":name" => $data["name"] ?? "",
    ":phone" => $data["phone"] ?? "",
    ":id_number" => $data["idNumber"] ?? "",
    ":line_id" => $data["lineId"] ?? "",
    ":dob" => $data["birthDate"] ?? null,
    ":address_home" => $data["address"] ?? "",
    ":holder_home" => $data["holderHome"] ?? "",
    ":address_residence" => trim(($data["residentArea"] ?? "") . " " . ($data["residentAddress"] ?? "")),
    ":holder_residence" => $data["holderResidence"] ?? "",
    ":company_name" => $data["companyName"] ?? "",
    ":company_address" => $data["companyAddress"] ?? "",
    ":company_phone" => $data["companyPhone"] ?? "",
    ":job_title" => $data["jobTitle"] ?? "",
    ":salary" => intval($data["salary"] ?? 0),
    ":labor_insurance" => $data["laborInsurance"] ?? "",
    ":work_years" => intval($data["workYears"] ?? 0),
    ":credit_status" => $data["creditStatus"] ?? "",
    ":has_credit_card" => $data["hasCreditCard"] ?? "",
    ":has_bank_loan" => $data["hasBankLoan"] ?? "",
    ":has_financing_loan" => $data["hasFinanceLoan"] ?? "",
    ":has_personal_loan" => $data["hasPersonalLoan"] ?? "",
    ":debt_detail" => $data["debtDetail"] ?? "",
    ":contact1_name" => $data["contact1Name"] ?? "",
    ":contact1_relation" => $data["contact1Relation"] ?? "",
    ":contact1_phone" => $data["contact1Phone"] ?? "",
    ":contact2_name" => $data["contact2Name"] ?? "",
    ":contact2_relation" => $data["contact2Relation"] ?? "",
    ":contact2_phone" => $data["contact2Phone"] ?? "",
    ":apply_date" => $apply_date,
    ":first_due_date" => $first_due_date,
    ":contract_date" => $contract_date,
    ":referral_code" => $referral_code,
    ":agent_id" => $agent_id,
    ":business_id" => $business_id
  ]);

  $application_id = $conn->lastInsertId();
} catch (Throwable $e) {
  echo json_encode(["success" => false, "error" => "SQL 錯誤：" . $e->getMessage()]);
  exit;
}

// ======================================================
// 🔹 上傳檔案區（支援前端 FormData 檔案）
// ======================================================
$uploaded_files = [];
error_log("========== [UPLOAD DEBUG] ==========");
error_log("🔍 Content-Type = " . ($_SERVER["CONTENT_TYPE"] ?? "未知"));
error_log("🔍 _FILES keys = " . json_encode(array_keys($_FILES)));
error_log("🔍 _POST keys = " . json_encode(array_keys($_POST)));

if (!empty($_FILES)) {
  $uploadDir = $_SERVER["DOCUMENT_ROOT"] . "/uploads/loan/";
  if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

  foreach ($_FILES as $field => $file) {
    if ($file["error"] === UPLOAD_ERR_OK && is_uploaded_file($file["tmp_name"])) {
      $ext = pathinfo($file["name"], PATHINFO_EXTENSION);
      $newName = uniqid("loan_", true) . "." . $ext;
      $targetPath = $uploadDir . $newName;
      error_log("📦 收到檔案欄位：{$field} | name={$file['name']} | size={$file['size']} | error={$file['error']}");

      if (move_uploaded_file($file["tmp_name"], $targetPath)) {
        $relativePath = "uploads/loan/" . $newName;
        $stmtFile = $conn->prepare("
          INSERT INTO loan_application_files (application_id, file_type, file_path, uploaded_at)
          VALUES (:application_id, :file_type, :file_path, NOW())
        ");
        $stmtFile->execute([
          ":application_id" => $application_no,
          ":file_type" => $field,
          ":file_path" => $relativePath
        ]);

        $uploaded_files[] = [
          "file_type" => $field,
          "file_path" => $relativePath
        ];

        error_log("✅ 檔案上傳成功: {$field} => {$relativePath}");
      } else {
        error_log("❌ move_uploaded_file 失敗: {$file['name']}");
      }
    } else {
      error_log("⚠️ 上傳錯誤：{$field} code={$file['error']}");
    }
  }
} else {
  error_log("⚠️ submit_loan.php：未收到任何檔案 | Content-Type=" . ($_SERVER["CONTENT_TYPE"] ?? "未知"));
}

// ======================================================
// 🔹 回傳結果
// ======================================================
echo json_encode([
  "success" => true,
  "application_id" => $application_id,
  "application_no" => $application_no,
  "referral_code" => $referral_code,
  "agent_id" => $agent_id,
  "business_id" => $business_id,
  "assigned_shift" => $shift,
  "referral_source" => $referral_source,
  "uploaded_files" => $uploaded_files
], JSON_UNESCAPED_UNICODE);
