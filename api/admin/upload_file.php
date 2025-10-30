<?php
// ==================================================
// update_file.php — 上傳主要檔案（loan_application_files）【正式安全版】
// ==================================================
// 🚫 防止 PHP 自動開預設 session 名稱 PHPSESSID
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

ob_start();
header("Content-Type: application/json; charset=utf-8");

ini_set("display_errors", 0);
ini_set("log_errors", 1);
ini_set("error_log", __DIR__ . "/update_file_error.log");
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
// 驗證登入狀態（僅限管理員）
// ==================================================
if (empty($_SESSION["admin_user"])) {
  ob_clean();
  echo json_encode(["success" => false, "error" => "未登入或登入逾時"]);
  exit;
}

// ==================================================
// 引入資料庫設定
// ==================================================
require_once __DIR__ . "/../../config/Database.php";

try {
  // ==================================================
  // 驗證上傳參數
  // ==================================================
  if (empty($_POST["application_id"]) || !is_numeric($_POST["application_id"])) {
    throw new Exception("缺少或無效的申請 ID");
  }
  if (empty($_POST["file_type"])) {
    throw new Exception("缺少檔案類型 (file_type)");
  }
  if (!isset($_FILES["file"])) {
    throw new Exception("未收到上傳檔案");
  }

  $applicationId = intval($_POST["application_id"]);
  $fileType = trim($_POST["file_type"]);

  // ==================================================
  // 檔案上傳處理
  // ==================================================
  $uploadDir = __DIR__ . "/../../../uploads/loan/";
  if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

  $ext = strtolower(pathinfo($_FILES["file"]["name"], PATHINFO_EXTENSION));
  $safeName = "{$fileType}_{$applicationId}_" . time() . "." . $ext;
  $relativePath = "uploads/loan/" . $safeName;
  $targetFile = $uploadDir . $safeName;

  if (!move_uploaded_file($_FILES["file"]["tmp_name"], $targetFile)) {
    throw new Exception("無法儲存上傳檔案");
  }

  // ==================================================
  // 寫入資料庫
  // ==================================================
  $db = new Database();
  $conn = $db->getConnection();
  if (!$conn) throw new Exception("資料庫連線失敗");

  $stmt = $conn->prepare("
    INSERT INTO loan_application_files (application_id, file_type, file_path)
    VALUES (:aid, :type, :path)
  ");
  $stmt->execute([
    ":aid" => $applicationId,
    ":type" => $fileType,
    ":path" => $relativePath
  ]);

  // ==================================================
  // 自動偵測 Base URL（支援 demo 子路徑）
  // ==================================================
  $scriptDir = dirname($_SERVER["SCRIPT_NAME"]);
  $baseUrl = (strpos($scriptDir, "/demo") !== false)
    ? "$protocol://$host/demo/"
    : "$protocol://$host/";

  // ==================================================
  // 成功回傳
  // ==================================================
  ob_clean();
  echo json_encode([
    "success" => true,
    "message" => "✅ 檔案上傳成功",
    "file_type" => $fileType,
    "file_path" => $relativePath,
    "full_url" => $baseUrl . ltrim($relativePath, "/")
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Throwable $e) {
  ob_clean();
  http_response_code(500);
  error_log("[ERROR update_file.php] " . $e->getMessage());
  echo json_encode([
    "success" => false,
    "error" => "伺服器錯誤：" . $e->getMessage(),
    "line" => $e->getLine()
  ], JSON_UNESCAPED_UNICODE);
}
?>
