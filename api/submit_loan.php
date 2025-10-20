<?php
// ======================================================
// api/submit_loan.php
// 接收前端申請資料，寫入 loan_applications + loan_application_files
// ======================================================

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/Database.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json; charset=utf-8");

// ======================================================
// 連線資料庫
// ======================================================
try {
    $db = new Database();
    $conn = $db->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "❌ 資料庫連線失敗：" . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

// ======================================================
// 取得前端 JSON
// ======================================================
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "無效的 JSON 資料"], JSON_UNESCAPED_UNICODE);
    exit;
}

// ==========================================================
// 1️⃣ 自動生成期數與金額
// ==========================================================
$total = intval($data['loanAmount'] ?? 12000);
$base = floor($total / 4);
$remainder = $total % 4;
$payAmounts = [$base + $remainder, $base, $base, $base];

$start = new DateTime();
$payDates = [];
for ($i = 0; $i < 4; $i++) {
    $d = clone $start;
    $d->modify("+".($i * 7)." days");
    $payDates[] = $d->format("Y-m-d");
}

$schedule = [];
foreach ($payDates as $i => $date) {
    $schedule[] = [
        "phase" => $i + 1,
        "date" => $date,
        "amount" => $payAmounts[$i]
    ];
}

// ==========================================================
// 2️⃣ 產生唯一申請編號
// ==========================================================
function generateUniqueApplicationNo($conn) {
    do {
        $application_no = '';
        for ($i = 0; $i < 24; $i++) {
            $application_no .= random_int(0, 9);
        }
        $stmt = $conn->prepare("SELECT COUNT(*) FROM loan_applications WHERE application_no = :no");
        $stmt->execute([':no' => $application_no]);
        $exists = $stmt->fetchColumn();
    } while ($exists > 0);
    return $application_no;
}

$application_no = generateUniqueApplicationNo($conn);

// ==========================================================
// 3️⃣ 寫入 loan_applications
// ==========================================================
try {
    $apply_date = date("Y-m-d");
    $first_due_date = date("Y-m-d", strtotime("+7 days"));

    $sql = "INSERT INTO loan_applications (
        application_no, name, phone, id_number, line_id, dob,
        address_home, holder_home, address_residence, holder_residence,
        company_name, company_address, company_phone, job_title, salary,
        labor_insurance, work_years, credit_status,
        has_credit_card, has_bank_loan, has_financing_loan, has_personal_loan,
        debt_detail,
        contact1_name, contact1_relation, contact1_phone,
        contact2_name, contact2_relation, contact2_phone,
        apply_date, first_due_date, installment_count, installment_amount,
        schedule_json, contract_date, loan_status, step
    ) VALUES (
        :application_no, :name, :phone, :id_number, :line_id, :dob,
        :address_home, :holder_home, :address_residence, :holder_residence,
        :company_name, :company_address, :company_phone, :job_title, :salary,
        :labor_insurance, :work_years, :credit_status,
        :has_credit_card, :has_bank_loan, :has_financing_loan, :has_personal_loan,
        :debt_detail,
        :contact1_name, :contact1_relation, :contact1_phone,
        :contact2_name, :contact2_relation, :contact2_phone,
        :apply_date, :first_due_date, 4, :installment_amount,
        :schedule_json, :contract_date, '待審核', 6
    )
    RETURNING id";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':application_no' => $application_no,
        ':name' => $data['name'] ?? '',
        ':phone' => $data['phone'] ?? '',
        ':id_number' => $data['idNumber'] ?? '',
        ':line_id' => $data['lineId'] ?? '',
        ':dob' => $data['birthDate'] ?? null,
        ':address_home' => $data['address'] ?? '',
        ':holder_home' => $data['holderHome'] ?? '',
        ':address_residence' => $data['resident'] ?? '',
        ':holder_residence' => $data['holderResidence'] ?? '',
        ':company_name' => $data['companyName'] ?? '',
        ':company_address' => $data['companyAddress'] ?? '',
        ':company_phone' => $data['companyPhone'] ?? '',
        ':job_title' => $data['jobTitle'] ?? '',
        ':salary' => intval($data['salary'] ?? 0),
        ':labor_insurance' => $data['laborInsurance'] ?? '',
        ':work_years' => intval($data['workYears'] ?? 0),
        ':credit_status' => $data['creditStatus'] ?? '',
        ':has_credit_card' => $data['hasCreditCard'] ?? '',
        ':has_bank_loan' => $data['hasBankLoan'] ?? '',
        ':has_financing_loan' => $data['hasFinanceLoan'] ?? '',
        ':has_personal_loan' => $data['hasPersonalLoan'] ?? '',
        ':debt_detail' => $data['debtDetail'] ?? '',
        ':contact1_name' => $data['contact1Name'] ?? '',
        ':contact1_relation' => $data['contact1Relation'] ?? '',
        ':contact1_phone' => $data['contact1Phone'] ?? '',
        ':contact2_name' => $data['contact2Name'] ?? '',
        ':contact2_relation' => $data['contact2Relation'] ?? '',
        ':contact2_phone' => $data['contact2Phone'] ?? '',
        ':installment_amount' => $base,
        ':schedule_json' => json_encode($schedule, JSON_UNESCAPED_UNICODE),
        ':apply_date' => $apply_date,
        ':first_due_date' => $first_due_date,
        ':contract_date' => $apply_date
    ]);

    // ⚠️ PostgreSQL RETURNING 要用 fetch() 拿 id 物件，而不是 fetchColumn()
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $application_id = $row['id'] ?? null;

    if (!$application_id) {
        throw new Exception("未取得返回的申請 ID");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "❌ SQL 錯誤：" . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

// ==========================================================
// 4️⃣ 儲存圖片 & 簽名檔（統一寫入 loan_application_files）
// ==========================================================
$uploadDir = __DIR__ . '/../uploads/loan/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$fileFields = [
    'idFront' => 'id_front',
    'idBack' => 'id_back',
    'healthCard' => 'nhic_quick',
    'bankBook' => 'bankbook',
    'selfie' => 'selfie',
    'secondId' => 'second_id',
    'signature' => 'signature'
];

foreach ($fileFields as $field => $type) {
    if (empty($data[$field])) continue;

    $base64 = $data[$field];
    if (preg_match('/^data:image\/(\w+);base64,/', $base64, $matches)) {
        $ext = strtolower($matches[1]);
        $image = base64_decode(substr($base64, strpos($base64, ',') + 1));
        if ($image === false) continue;

        $filename = "{$type}_{$application_id}." . $ext;
        $filepath = $uploadDir . $filename;
        file_put_contents($filepath, $image);

        $stmt2 = $conn->prepare("
            INSERT INTO loan_application_files (application_id, file_type, file_path)
            VALUES (:id, :type, :path)
        ");
        $stmt2->execute([
            ':id' => $application_id,
            ':type' => $type,
            ':path' => 'uploads/loan/' . $filename
        ]);
    }
}

// ==========================================================
// 5️⃣ 回傳結果
// ==========================================================
echo json_encode([
    "success" => true,
    "application_id" => $application_id,
    "application_no" => $application_no
], JSON_UNESCAPED_UNICODE);
