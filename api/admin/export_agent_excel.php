<?php
// ==================================================
// export_agent_excel.php — 匯出代理商專屬客戶報表
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');


ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

// === CORS 設定（同步前端） ===
$allowed_origins = [
  "http://localhost:5173",
  "https://2025.moneyfast.cc",
  "https://www.2025.moneyfast.cc"
];
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (in_array($origin, $allowed_origins)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Access-Control-Allow-Credentials: true");
}
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

// === 載入資料庫與 Excel 函式庫 ===
require_once __DIR__ . '/../../config/Database.php';
require_once __DIR__ . '/../../lib/SimpleXLSXGen.php';
use Shuchkin\SimpleXLSXGen;

// === 啟用 Session ===
ini_set("session.cookie_samesite", "None");
ini_set("session.cookie_secure", "true");
session_start();

// === 驗證登入狀態 ===
if (!isset($_SESSION["agent_user"])) {
  echo json_encode(["success" => false, "error" => "未登入代理商帳號"]);
  exit;
}

try {
  $db = new Database();
  $conn = $db->getConnection();

  // === 從 Session 取出代理商資訊 ===
  $agent = $_SESSION["agent_user"];
  $referral_code = $agent["referral_code"] ?? null;

  if (!$referral_code) {
    echo json_encode(["success" => false, "error" => "找不到代理商推薦碼"]);
    exit;
  }

  // === 查詢該代理商推薦的客戶 ===
  $stmt = $conn->prepare("
    SELECT
      la.id AS loan_id,
      la.name AS customer_name,
      la.phone AS customer_phone,
      la.status AS loan_status,
      la.apply_date AS apply_date,
      la.updated_at AS updated_at,
      la.amount AS loan_amount,
      la.agent_referral_code
    FROM loan_applications AS la
    WHERE la.agent_referral_code = :referral_code
    ORDER BY la.updated_at DESC
  ");
  $stmt->execute([":referral_code" => $referral_code]);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (!$rows) {
    echo json_encode(["success" => false, "error" => "目前沒有可匯出的客戶資料"]);
    exit;
  }

  // === 轉換成 Excel 格式 ===
  $data = [["申請編號", "客戶姓名", "電話", "貸款金額", "狀態", "申請日期", "最後更新"]];
  foreach ($rows as $r) {
    $data[] = [
      $r["loan_id"],
      $r["customer_name"],
      $r["customer_phone"],
      $r["loan_amount"],
      $r["loan_status"],
      $r["apply_date"],
      $r["updated_at"]
    ];
  }

  // === 產生 Excel 檔案 ===
  $filename = "AgentReport_" . date("Ymd_His") . ".xlsx";
  $xlsx = SimpleXLSXGen::fromArray($data);
  $xlsx->downloadAs($filename);
  exit;

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    "success" => false,
    "error" => "伺服器錯誤：" . $e->getMessage(),
    "line" => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
