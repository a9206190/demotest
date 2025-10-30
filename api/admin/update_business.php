<?php
// ==================================================
// update_business.php — 更新業務個人資料（非必填欄位、安全版）
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

header("Content-Type: application/json; charset=utf-8");
ini_set("display_errors", 0);
ini_set("log_errors", 1);
ini_set("error_log", __DIR__ . "/update_business_error.log");
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
// CORS 設定（統一三網域）
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
// 資料庫連線
// ==================================================
require_once __DIR__ . "/../../config/Database.php";

try {
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception("資料庫連線失敗");

  // ==================================================
  // 取得登入者資訊（支援 business_user 或 admin_user）
  // ==================================================
  $session_user = $_SESSION["business_user"] ?? $_SESSION["admin_user"] ?? null;
  $business_id = $session_user["business_id"] ?? null;

  // 若未登入，允許從 POST 取得 business_id（僅限管理端操作）
  $data = json_decode(file_get_contents("php://input"), true);
  if (!$business_id && isset($data["business_id"])) {
    $business_id = trim($data["business_id"]);
  }

  if (!$business_id) throw new Exception("缺少 business_id 或未登入");

  // ==================================================
  // 動態欄位更新
  // ==================================================
  $updateable = ["name", "phone", "email", "line_id"];
  $fields = [];
  $params = [":business_id" => $business_id];

  foreach ($updateable as $col) {
    if (isset($data[$col]) && trim($data[$col]) !== "") {
      $fields[] = "$col = :$col";
      $params[":$col"] = trim($data[$col]);
    }
  }

  // 若有需更新欄位
  if (!empty($fields)) {
    $sql = "UPDATE business_list SET " . implode(", ", $fields) . ", updated_at = NOW() WHERE business_id = :business_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
  }

  // ==================================================
  // 若有新密碼 → 同步更新 admin_list.password_hash
  // ==================================================
  if (!empty($data["new_password"]) && trim($data["new_password"]) !== "") {
    $hash = password_hash(trim($data["new_password"]), PASSWORD_BCRYPT);

    $stmt2 = $conn->prepare("
      UPDATE admin_list a
      JOIN business_list b ON a.full_name = b.name
      SET a.password_hash = :pw, a.updated_at = NOW()
      WHERE b.business_id = :bid AND a.role = 'BAdmin'
    ");
    $stmt2->execute([
      ":pw" => $hash,
      ":bid" => $business_id
    ]);
  }

  // ==================================================
  // 查詢更新後資料
  // ==================================================
  $fetch = $conn->prepare("
    SELECT 
      business_id, name, phone, email, line_id, 
      referral_code, referral_url, status, updated_at
    FROM business_list
    WHERE business_id = :bid
  ");
  $fetch->execute([":bid" => $business_id]);
  $updated = $fetch->fetch(PDO::FETCH_ASSOC);

  if (!$updated) throw new Exception("更新後查無資料 (business_id=$business_id)");

  // ==================================================
  // 成功回傳
  // ==================================================
  echo json_encode([
    "success" => true,
    "message" => !empty($data["new_password"])
      ? "✅ 資料與密碼已同步更新"
      : "✅ 資料更新成功",
    "data" => $updated
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  http_response_code(500);
  error_log("[ERROR update_business.php] " . $e->getMessage());
  echo json_encode([
    "success" => false,
    "error" => "伺服器錯誤：" . $e->getMessage(),
    "line" => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
