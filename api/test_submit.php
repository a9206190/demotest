<?php
// ======================================================
// test_call_submit_loan_random.php
// 測試用：隨機產生表單資料並呼叫 submit_loan.php
// referral_code 隨機從 9AG458 或 S5YY8L 選一個（可用 ?ref= 指定）
// ✅ 新增：同時模擬上傳 bankbook_6.jpeg + signature_7.png（若存在）
// ======================================================

header("Content-Type: application/json; charset=utf-8");
ini_set("display_errors", 1);
ini_set("log_errors", 1);
error_reporting(E_ALL);

// === 設定 submit_loan API 的 URL（正式站） ===
$apiUrl = "https://www.moneyfast.cc/api/submit_loan.php"; // ✅ 已改為正確 www domain

// === 允許用 ?ref= 指定 referral_code，否則隨機選擇 ===
$requestedRef = trim($_GET['ref'] ?? '');
$choices = ['9AG458','YJN8NW'];
if ($requestedRef !== '') {
  $referral_code = $requestedRef;
} else {
  $referral_code = $choices[array_rand($choices)];
}

// === 協助函式 ===
function rand_from($arr){ return $arr[array_rand($arr)]; }
function randPhone(){ return '09' . str_pad((string)rand(0, 99999999), 8, '0', STR_PAD_LEFT); }
function randName(){
  $first = ["測試王","測試陳","測試李","測試林","測試蔡","測試張","測試黃","測試周","測試吳","測試徐"];
  $last = ["大明","小美","志強","怡君","建宏","佳玲","冠宇","雅婷","志豪","孟潔"];
  return rand_from($first) . rand_from($last);
}
function randIdNumber(){
  $letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return $letters[rand(0,25)] . str_pad((string)rand(0,999999999),9,'0',STR_PAD_LEFT);
}
function randCompany(){
  $suffix = ["股份有限公司","有限公司","科技股份有限公司","企業社"];
  $names = ["測試富士旺","測試創業佳","測試金鼎","測試信誠","測試新安"];
  return rand_from($names) . rand_from($suffix);
}
function randAddress(){
  $cities = ["測試台北市","測試新北市","測試桃園市","測試台中市","測試高雄市","測試台南市"];
  $streets = ["中山路","中正路","光復路","民族路","復興路","信義路","民生路"];
  return rand_from($cities) . rand_from($streets) . strval(rand(1,999)) . "號";
}

// === 隨機表單欄位 ===
$phone = randPhone();
$name = randName();
$idNumber = randIdNumber();
$lineId = 'line_' . strtolower(substr(md5(mt_rand()), 0, 8));
$birth = date('Y-m-d', strtotime('-' . rand(20,55) . ' years'));
$address = randAddress();
$companyName = randCompany();
$companyAddress = randAddress();
$companyPhone = '0' . str_pad((string)rand(20000000, 99999999),8,'0',STR_PAD_LEFT);
$jobTitle = rand_from(["測試業務專員","測試門市人員","測試工程師","測試行政助理","測試客服"]);
$salary = rand(25000, 80000);
$laborInsurance = rand(0,1) ? '有' : '無';
$workYears = rand(0,20);
$creditStatus = rand_from(["正常","呆賬","警示戶"]);
$hasCreditCard = rand(0,1) ? '有' : '無';
$hasBankLoan = rand(0,1) ? '有' : '無';
$hasFinanceLoan = rand(0,1) ? '有' : '無';
$hasPersonalLoan = rand(0,1) ? '有' : '無';
$debtDetail = rand(0,1) ? "目前無其他負債" : "某銀行貸款剩餘{$salary}元";
$contact1Name = randName();
$contact1Relation = rand_from(["測試朋友","測試家人","測試同事"]);
$contact1Phone = randPhone();
$contact2Name = randName();
$contact2Relation = rand_from(["測試親戚","測試同事","測試朋友"]);
$contact2Phone = randPhone();
$loanAmount = rand_from([10000,12000,15000,20000]);

// === 建立 payload ===
$payload = [
  "name" => $name,
  "phone" => $phone,
  "idNumber" => $idNumber,
  "lineId" => $lineId,
  "birthDate" => $birth,
  "address" => $address,
  "holderHome" => "本人",
  "residentArea" => substr($address, 0, 3),
  "residentAddress" => $address,
  "holderResidence" => "本人",
  "companyName" => $companyName,
  "companyAddress" => $companyAddress,
  "companyPhone" => $companyPhone,
  "jobTitle" => $jobTitle,
  "salary" => $salary,
  "laborInsurance" => $laborInsurance,
  "workYears" => $workYears,
  "creditStatus" => $creditStatus,
  "hasCreditCard" => $hasCreditCard,
  "hasBankLoan" => $hasBankLoan,
  "hasFinanceLoan" => $hasFinanceLoan,
  "hasPersonalLoan" => $hasPersonalLoan,
  "debtDetail" => $debtDetail,
  "contact1Name" => $contact1Name,
  "contact1Relation" => $contact1Relation,
  "contact1Phone" => $contact1Phone,
  "contact2Name" => $contact2Name,
  "contact2Relation" => $contact2Relation,
  "contact2Phone" => $contact2Phone,
  "loanAmount" => $loanAmount,
  "referral_code" => $referral_code,
];

// === 嘗試讀取測試圖片 ===
$baseDir = $_SERVER["DOCUMENT_ROOT"] . "/uploads/loan/";
$bankbookFile = $baseDir . "bankbook_6.jpeg";
$signatureFile = $baseDir . "signature_7.png";
$fileExistsBankbook = file_exists($bankbookFile);
$fileExistsSignature = file_exists($signatureFile);

// === 初始化 cURL ===
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Expect:"]);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // ✅ 自動跟隨 301 redirect

// === 如果任一檔案存在，使用 multipart/form-data 模式 ===
if ($fileExistsBankbook || $fileExistsSignature) {
  $formData = $payload;

  if ($fileExistsBankbook) {
    $formData['bankbook'] = new CURLFile($bankbookFile, mime_content_type($bankbookFile), basename($bankbookFile));
  }
  if ($fileExistsSignature) {
    $formData['signature'] = new CURLFile($signatureFile, mime_content_type($signatureFile), basename($signatureFile));
  }

  $uploadMsg = [];
  if ($fileExistsBankbook) $uploadMsg[] = "✅ bankbook_6.jpeg";
  else $uploadMsg[] = "⚠️ 找不到 bankbook_6.jpeg";
  if ($fileExistsSignature) $uploadMsg[] = "✅ signature_7.png";
  else $uploadMsg[] = "⚠️ 找不到 signature_7.png";

  $mode = "multipart/form-data (含上傳：" . implode("、", $uploadMsg) . ")";
  curl_setopt($ch, CURLOPT_POSTFIELDS, $formData);
} else {
  // === 否則使用 JSON 模式 ===
  curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json; charset=utf-8"]);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
  $mode = "application/json (無檔案)";
}

$response = curl_exec($ch);
$curlErr = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// === 準備回傳結果 ===
$result = [
  "success" => true,
  "note" => "測試請求已送出至 submit_loan.php",
  "mode" => $mode,
  "api_url" => $apiUrl,
  "http_code" => $httpCode,
  "curl_error" => $curlErr ?: null,
  "payload_sent" => $payload,
  "api_response_raw" => null,
];

// === 解析回應（若為 JSON） ===
if ($response !== false && $response !== null && $response !== '') {
  $decoded = json_decode($response, true);
  $result['api_response_raw'] = $decoded === null ? $response : $decoded;
} else {
  $result['api_response_raw'] = $response;
}

// === 輸出結果 ===
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
