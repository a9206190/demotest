<?php
/**
 * contract_pdf.php — PDF 合約自動生成 (mPDF 8+)
 * 支援繁體中文、base64 圖片壓縮、安全輸出、CORS、自動日期與期數
 */

// ===============================
// 初始化與 CORS
// ===============================
while (ob_get_level()) ob_end_clean();
header_remove();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

// ===============================
// PHP 環境最佳化
// ===============================
ini_set("display_errors", 1);
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set("memory_limit", "1024M");
ini_set("pcre.backtrack_limit", "10000000");
ini_set("pcre.recursion_limit", "10000000");
set_time_limit(180);

// ===============================
// 載入 mPDF
// ===============================
require_once __DIR__ . "/../vendor/autoload.php";

use Mpdf\Mpdf;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;

// ===============================
// 接收前端 JSON
// ===============================
$raw = file_get_contents("php://input");
$form = json_decode($raw, true);

if (!$form) {
  http_response_code(400);
  echo json_encode(["success" => false, "error" => "缺少或無效的 JSON"]);
  exit;
}

// ===============================
// 字型設定（繁體中文）
// ===============================
$defaultConfig = (new ConfigVariables())->getDefaults();
$fontDirs = $defaultConfig["fontDir"];
$defaultFontConfig = (new FontVariables())->getDefaults();
$fontData = $defaultFontConfig["fontdata"];

$customFontDir = __DIR__ . "/../fonts";
if (!is_dir($customFontDir)) @mkdir($customFontDir, 0777, true);

$mpdf = new Mpdf([
  "mode" => "utf-8",
  "format" => "A4",
  "tempDir" => __DIR__ . "/../tmp",
  "fontDir" => array_merge($fontDirs, [$customFontDir]),
  "fontdata" => $fontData + [
    "notosanstc" => [
      "R" => "NotoSansTC-Regular.ttf",
      "B" => "NotoSansTC-Bold.ttf",
    ],
  ],
  "default_font" => "notosanstc",
  "isRemoteEnabled" => true,
]);
$mpdf->SetCompression(true);
$mpdf->autoLangToFont = true;
$mpdf->autoScriptToLang = true;

// ===============================
// 期數與金額計算
// ===============================
$total = intval($form["loanAmount"] ?? 12000);
$base = floor($total / 4);
$remainder = $total % 4;
$payAmounts = [$base + $remainder, $base, $base, $base];

$start = new DateTime();
$payDates = [];
for ($i = 0; $i < 4; $i++) {
  $d = clone $start;
  $d->modify("+" . ($i * 7) . " days");
  $payDates[] = $d->format("Y/m/d");
}

// ===============================
// 圖片壓縮函式
// ===============================
function compressBase64Image($dataUrl, $maxWidth = 320, $quality = 40) {
  if (!$dataUrl || strpos($dataUrl, "base64,") === false) return "";
  $data = explode(",", $dataUrl, 2)[1] ?? "";
  $binary = base64_decode($data);
  if (!$binary) return "";

  $img = @imagecreatefromstring($binary);
  if (!$img) return "";

  $width = imagesx($img);
  $height = imagesy($img);

  // 比例縮放
  if ($width > $maxWidth) {
    $newWidth = $maxWidth;
    $newHeight = intval($height * ($maxWidth / $width));
  } else {
    $newWidth = $width;
    $newHeight = $height;
  }

  $tmp = imagecreatetruecolor($newWidth, $newHeight);
  imagecopyresampled($tmp, $img, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

  ob_start();
  imagejpeg($tmp, null, $quality);
  $resized = ob_get_clean();

  imagedestroy($img);
  imagedestroy($tmp);

  return "data:image/jpeg;base64," . base64_encode($resized);
}

// ===============================
// HTML & CSS
// ===============================
$html = '
<style>
body { font-family: notosanstc; font-size: 11pt; color: #111; line-height: 1.6; }
h2, h3 { text-align: center; margin-bottom: 8px; }
p { margin: 6px 0; }
ul { margin: 5px 0 10px 20px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
td { border: 1px solid #ccc; text-align: center; vertical-align: middle; padding: 6px; }
img { display: block; margin: 8px auto; border: 1px solid #ddd; border-radius: 6px; }
.footer { text-align:center; font-size:9pt; margin-top:15px; color:#666; }
</style>

<h2>金錢消費借貸契約書</h2>
<p>甲方願將新臺幣 <b>' . number_format($total) . '</b> 元整貸與乙方。</p>
<p>二、還款日期與金額：</p>
<ul>';

foreach ($payDates as $i => $date) {
  $html .= "<li>第 " . ($i + 1) . " 期 {$date}：新臺幣 " . number_format($payAmounts[$i]) . " 元整</li>";
}

$html .= "</ul>
<p>三、乙方同意創業佳數位科技有限公司進行必要之徵信調查，並支付徵信費用參仟伍佰元整。</p>
<p>四、開辦費：伍佰元整。</p>
<p>五、如違反本契約，乙方應賠償懲罰性違約金伍萬元整予甲方。</p>
<p>六、貸款核準最終解釋權歸於本公司。</p>
<p>七、訴訟以臺灣桃園地方法院為第一審管轄法院。</p>
<p>申貸日期：" . $payDates[0] . "</p>
<p>首次還款日：" . $payDates[1] . "</p>
<br>
<p>立契約書人：</p>
<p>貸與人：富士旺實業股份有限公司（甲方）</p>
<p>借用人：" . htmlspecialchars($form["name"] ?? "（乙方）") . "</p>";

// 簽名
if (!empty($form["signature"])) {
  $html .= "<p>簽名：</p><img src='" . compressBase64Image($form["signature"]) . "' width='200'>";
}

// 上傳文件
$fields = [
  "idFront" => "身分證正面",
  "idBack" => "身分證背面",
  "healthCard" => "健保卡",
  "bankBook" => "存摺封面",
  "selfie" => "手持自拍照",
  "secondId" => "第二證件",
];

$html .= "<br><h3>上傳之證件影本</h3><table><tr>";
$i = 0;
foreach ($fields as $key => $label) {
  if ($i > 0 && $i % 3 == 0) $html .= "</tr><tr>";
  $img = compressBase64Image($form[$key] ?? "");
  $html .= "<td><b>{$label}</b><br>" . ($img ? "<img src='{$img}'>" : "（未上傳）") . "</td>";
  $i++;
}
$html .= "</tr></table>";
$html .= '<div class="footer">本文件由系統自動生成，無需人工簽章。© 富士旺實業股份有限公司</div>';

// ===============================
// 輸出 PDF
// ===============================
$mpdf->WriteHTML($html);
$pdf = $mpdf->Output("", "S");

$filename = "合約書_" . preg_replace("/[^\w\-]/u", "_", ($form["name"] ?? "客戶")) . ".pdf";

header("Content-Type: application/pdf");
header("Content-Disposition: attachment; filename=\"{$filename}\"");
header("Content-Length: " . strlen($pdf));

echo $pdf;
exit;
