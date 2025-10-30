<?php
/**
 * ============================================================
 * migrate_loan_files.php
 * 將舊的 loan_application_files 搬到新的 loan_application_files
 * - 自動比對欄位
 * - 自動補空欄位
 * - 避免外鍵錯誤
 * - REPLACE INTO 保證安全覆蓋
 * ============================================================
 */

header("Content-Type: text/plain; charset=utf-8");
ini_set("display_errors", 1);
error_reporting(E_ALL);

// === 資料庫設定 ===
$oldDB = new mysqli("localhost", "demotest", "Aa1234567", "demotest");     // 舊 DB
$newDB = new mysqli("localhost", "moneyfast", "Moneyfast20251010", "moneyfast");  // 新 DB

if ($oldDB->connect_error || $newDB->connect_error) {
  die("❌ 資料庫連線錯誤：" . $oldDB->connect_error . " / " . $newDB->connect_error);
}

$oldDB->set_charset("utf8mb4");
$newDB->set_charset("utf8mb4");

$oldTable = "loan_application_files";
$newTable = "loan_application_files";

// === 抓欄位 ===
$oldCols = [];
$newCols = [];

$res1 = $oldDB->query("SHOW COLUMNS FROM `$oldTable`");
while ($r = $res1->fetch_assoc()) $oldCols[] = $r["Field"];

$res2 = $newDB->query("SHOW COLUMNS FROM `$newTable`");
while ($r = $res2->fetch_assoc()) $newCols[] = $r["Field"];

echo "🔍 舊表欄位：" . implode(", ", $oldCols) . "\n";
echo "🔍 新表欄位：" . implode(", ", $newCols) . "\n\n";

// === 關閉外鍵檢查以清空表 ===
echo "🚀 準備清空新表...\n";
$newDB->query("SET foreign_key_checks = 0");
$newDB->query("DELETE FROM `$newTable`"); // 用 DELETE 避免外鍵錯誤
$newDB->query("SET foreign_key_checks = 1");
echo "⚠️ 已清空 `$newTable`。\n";

// === 搬移資料 ===
$data = $oldDB->query("SELECT * FROM `$oldTable`");
if (!$data) die("❌ 無法讀取舊資料：" . $oldDB->error);

$count = 0;
$fail = 0;

echo "🚀 開始搬移...\n";

while ($row = $data->fetch_assoc()) {
  $mapped = [];

  // 比對欄位 — 新有就帶，沒有的補 NULL
  foreach ($newCols as $col) {
    $mapped[$col] = array_key_exists($col, $row) ? $row[$col] : null;
  }

  // 轉換 uploaded_at → timestamp 格式
  if (!empty($mapped['uploaded_at']) && strtotime($mapped['uploaded_at'])) {
    $mapped['uploaded_at'] = date('Y-m-d H:i:s', strtotime($mapped['uploaded_at']));
  }

  // 轉義
  $fields = [];
  $values = [];
  foreach ($mapped as $key => $val) {
    $fields[] = "`$key`";
    $values[] = isset($val) ? "'" . $newDB->real_escape_string($val) . "'" : "NULL";
  }

  // 用 REPLACE INTO 保證覆蓋
  $sql = "REPLACE INTO `$newTable` (" . implode(", ", $fields) . ") VALUES (" . implode(", ", $values) . ")";
  
  if (!$newDB->query($sql)) {
    $fail++;
    echo "⚠️ 插入失敗（ID {$row['id']}）：" . $newDB->error . "\n";
  } else {
    $count++;
  }
}

echo "\n✅ 搬移完成，共成功插入 {$count} 筆，失敗 {$fail} 筆。\n";

$oldDB->close();
$newDB->close();
