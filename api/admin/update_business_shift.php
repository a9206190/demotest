<?php
// ==================================================
// update_business_shift.php — 新增或更新業務排班（統一 Session / CORS / 安全版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Content-Type: application/json; charset=utf-8");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
ini_set("error_log", __DIR__ . "/update_business_shift_error.log");
error_reporting(E_ALL);

// ==================================================
// PHP 相容性補強（for PHP < 8）
// ==================================================
if (!function_exists("str_contains")) {
  function str_contains($haystack, $needle) {
    return $needle !== '' && strpos($haystack, $needle) !== false;
  }
}

// ==================================================
// 環境偵測
// ==================================================
$protocol = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
$host = $_SERVER["HTTP_HOST"] ?? "localhost";
$isHttps = $protocol === "https";
$inDemo = str_contains(__DIR__, "/demo/");
$basePath = $inDemo ? "/demo/" : "/";
$cookieDomain = str_contains($host, "moneyfast.cc") ? ".moneyfast.cc" : $host;

// ==================================================
// CORS 設定（固定三網域）
// ==================================================
$allowed_origins = [
  "http://localhost:5173",
  "https://moneyfast.cc",
  "https://www.moneyfast.cc"
];
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

// ==================================================
// Session 安全設定（統一 check_session 架構）
// ==================================================
session_set_cookie_params([
  "lifetime" => 0,
  "path" => $basePath,
  "domain" => $cookieDomain,
  "secure" => $isHttps,
  "httponly" => true,
  "samesite" => "None"
]);
session_start();

// ==================================================
// 驗證登入狀態（僅限管理端）
// ==================================================
if (empty($_SESSION["admin_user"])) {
  echo json_encode(["success" => false, "error" => "未登入或登入已過期"]);
  exit;
}

// ==================================================
// 資料庫連線
// ==================================================
require_once __DIR__ . "/../../config/Database.php";

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception("資料庫連線失敗");

  // ==================================================
  // 接收資料
  // ==================================================
  $data = json_decode(file_get_contents("php://input"), true);
  $business_id = $data["business_id"] ?? null;
  $shift_date = $data["shift_date"] ?? date("Y-m-d");
  $work_shift = trim($data["work_shift"] ?? "");

  if (!$business_id || !$work_shift) {
    echo json_encode(["success" => false, "error" => "缺少必要參數（business_id 或 work_shift）"]);
    exit;
  }

  // ==================================================
  // 確保資料表存在（防止空資料錯誤）
  // ==================================================
  $conn->exec("
    CREATE TABLE IF NOT EXISTS business_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      business_id VARCHAR(20) NOT NULL,
      shift_date DATE NOT NULL,
      work_shift ENUM('早班','午班','晚班') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_shift (business_id, shift_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  ");

  // ==================================================
  // Upsert（依 business_id + shift_date）
  // ==================================================
  $stmt = $conn->prepare("
    INSERT INTO business_shifts (business_id, shift_date, work_shift)
    VALUES (:business_id, :shift_date, :work_shift)
    ON DUPLICATE KEY UPDATE 
      work_shift = VALUES(work_shift),
      updated_at = NOW()
  ");
  $stmt->execute([
    ":business_id" => $business_id,
    ":shift_date" => $shift_date,
    ":work_shift" => $work_shift
  ]);

  // ==================================================
  // 回傳成功結果
  // ==================================================
  echo json_encode([
    "success" => true,
    "message" => "排班已儲存成功",
    "data" => [
      "business_id" => $business_id,
      "shift_date" => $shift_date,
      "work_shift" => $work_shift
    ]
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  error_log("[ERROR update_business_shift.php] " . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "error" => "伺服器錯誤：" . $e->getMessage(),
    "line" => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
