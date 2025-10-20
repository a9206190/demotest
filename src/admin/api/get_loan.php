<?php
require_once __DIR__ . '/../../../config/cors.php';
require_once __DIR__ . '/../../../config/Database.php';

try {
  $db = new Database();
  $conn = $db->getConnection();

  // === 撈取所有申貸資料（完整對應欄位） ===
  $stmt = $conn->prepare("
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
  ");
  $stmt->execute();
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // === 補空值以防止 null ===
  foreach ($rows as &$r) {
    foreach ($r as $key => $val) {
      if ($val === null) $r[$key] = '';
    }
    // 額外預設值
    $r['loan_status'] = $r['loan_status'] ?: '待審核';
    $r['step'] = (int)($r['step'] ?: 1);
    $r['installment_count'] = (int)($r['installment_count'] ?: 0);
    $r['installment_amount'] = (int)($r['installment_amount'] ?: 0);
  }

  echo json_encode([
    "success" => true,
    "data" => $rows
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode([
    "success" => false,
    "error" => $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
