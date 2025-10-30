<?php
// ==================================================
// download_contract.php — MoneyFast 契約書 PDF 生成 
// 整合 init_session  + CORS + 正確輸出
// ==================================================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// === 防止 PHP 預設 session 名稱干擾 ===
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
session_name('moneyfast_sess');

// === 載入統一 Session / CORS 模組 ===
require_once __DIR__ . '/init_session.php';

// === 自動載入器與資料庫 ===
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/Database.php';

use Mpdf\Mpdf;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;

// ==================================================
//  權限驗證（僅登入後可用）
// ==================================================
if (!isset($_SESSION["user"])) {
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(["success" => false, "error" => "未登入或登入已過期"]);
  exit;
}

// ==================================================
//  參數取得
// ==================================================
$applicationNo = $_GET['application_no'] ?? '';
$id = $_GET['id'] ?? '';

if (!$applicationNo && !$id) {
  die("❌ 缺少參數（application_no 或 id）");
}

// ==================================================
//  讀取資料庫
// ==================================================
try {
  $db = new Database();
  $conn = $db->getConnection();

  if ($applicationNo) {
    $stmt = $conn->prepare("SELECT * FROM loan_applications WHERE application_no = ?");
    $stmt->execute([$applicationNo]);
  } else {
    $stmt = $conn->prepare("SELECT * FROM loan_applications WHERE id = ?");
    $stmt->execute([$id]);
  }

  $loan = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$loan) die("❌ 查無此申貸資料");

    $stmt2 = $conn->prepare("
      SELECT * FROM loan_application_files 
      WHERE application_id = :app_id OR application_id = :app_no
    ");
    $stmt2->execute([
      ':app_id' => $loan['id'],
      ':app_no' => $loan['application_no']
    ]);
    $files = $stmt2->fetchAll(PDO::FETCH_ASSOC);

  } catch (Exception $e) {
    die("❌ 資料庫錯誤：" . $e->getMessage());
  }


// ==================================================
//  mPDF 設定
// ==================================================
$tmpDir = __DIR__ . '/../../tmp';
$fontDir = __DIR__ . '/../../fonts';
if (!is_dir($tmpDir)) mkdir($tmpDir, 0777, true);
if (!is_dir($fontDir)) mkdir($fontDir, 0777, true);

$defaultConfig = (new ConfigVariables())->getDefaults();
$fontDirs = $defaultConfig['fontDir'];
$defaultFontConfig = (new FontVariables())->getDefaults();
$fontData = $defaultFontConfig['fontdata'];

$mpdf = new Mpdf([
  'mode' => 'utf-8',
  'format' => 'A4',
  'tempDir' => $tmpDir,
  'fontDir' => array_merge($fontDirs, [$fontDir]),
  'fontdata' => $fontData + [
    'notosanstc' => [
      'R' => 'NotoSansTC-Regular.ttf',
      'B' => file_exists("$fontDir/NotoSansTC-Bold.ttf") ? 'NotoSansTC-Bold.ttf' : 'NotoSansTC-Regular.ttf',
    ],
  ],
  'default_font' => 'notosanstc',
  'isRemoteEnabled' => true,
]);
$mpdf->autoLangToFont = true;
$mpdf->autoScriptToLang = true;
$mpdf->SetDisplayMode('fullwidth');

// ==================================================
//  File Type 翻譯
// ==================================================
function translateFileType($type) {
  $map = [
    'id_front' => '身分證正面',
    'id_back' => '身分證反面',
    'nhic_quick' => '健保快易通',
    'bankbook' => '存摺封面',
    'selfie' => '手持身份證自拍',
    'second_id' => '電信賬單拍照',
    'signature' => '簽名檔',
  ];
  return $map[strtolower($type)] ?? $type;
}

// ==================================================
//  CSS 樣式
// ==================================================
$css = '
body { font-family:"notosanstc","Microsoft JhengHei",sans-serif; font-size:11pt; color:#111; line-height:1.7; }
h2 { display:flex; justify-content:space-between; align-items:center; background:#f3f4f6; padding:10px 14px; border-left:5px solid #2563eb; }
h2 span:last-child { margin-left:auto; color:#555; font-size:10pt; }
h3 { margin:14px 0 8px 0; font-size:13pt; }
table { width:100%; border-collapse:collapse; margin-top:8px; }
td,th { border:1px solid #ccc; padding:7px 9px; vertical-align:top; text-align:left; }
.table-info td:first-child { width:35%; font-weight:bold; background:#f9fafb; }
.layout-two-col td { border:none; vertical-align:top; width:50%; padding-right:10px; }
h3.upload-title { text-align:center; background:#f8fafc; padding:8px 0; border-radius:6px; font-size:14pt; margin-top:10px; font-weight:bold; }
.image-pair { width:100%; border-collapse:collapse; margin-top:18px; }
.image-pair td { width:50%; padding:10px 15px; text-align:center; vertical-align:top; }
.imgBox { display:flex; flex-direction:column; align-items:center; }
.imgLabel { font-weight:bold; font-size:11pt; margin-bottom:6px; text-align:center; }
.imgFrame { background:#fff; border:1px solid #ccc; border-radius:8px; width:250px; height:160px; overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
.imgFrame img { width:100%; height:100%; object-fit:cover; object-position:center center; display:block; }
.note-box { border:1px solid #ddd; background:#fafafa; padding:18px; border-radius:8px; margin-top:10px; }
.contract-title { text-align:center; font-size:18pt; font-weight:bold; margin-bottom:14px; letter-spacing:2px; }
.signature { margin-top:25px; text-align:left; }
.signature img { width:320px; border:1px solid #bbb; border-radius:3px; margin-top:6px; }
.page-break { page-break-after:always; }
';

// ==================================================
//  Header & Title
// ==================================================
$companyName = "MoneyFast";
$now = date('Y-m-d H:i');
$title = "申請編號 {$loan['application_no']} - {$loan['name']}";
$applyDate = $loan['apply_date'] ? date('Y-m-d', strtotime($loan['apply_date'])) : '未提供';
$phone = $loan['phone'] ?? '未填寫';

$html = "
<h2 style='display:flex; justify-content:space-between; align-items:flex-start;'>
  <div style='display:flex; flex-direction:column; align-items:flex-start;'>
    <span style='font-size:13pt; font-weight:bold;'>{$title}</span><br>
    <span style='font-size:10pt; color:#555; margin-top:4px; line-height:1.6;'>
      📞 電話：{$phone}　📅 申請日期：{$applyDate}
    </span>
  </div>
  <div style='font-size:10pt; color:#555; text-align:right; white-space:nowrap;'>
    {$companyName} ｜ {$now}
  </div>
</h2>
";

// ==================================================
//  基本資料 + 聯絡人 + 合約資訊
// ==================================================
$left = "
<h3>基本資料</h3>
<table class='table-info'>
<tr><td>姓名</td><td>{$loan['name']}</td></tr>
<tr><td>電話</td><td>{$loan['phone']}</td></tr>
<tr><td>身分證號</td><td>{$loan['id_number']}</td></tr>
<tr><td>生日</td><td>{$loan['dob']}</td></tr>
<tr><td>Line ID</td><td>{$loan['line_id']}</td></tr>
<tr><td>住家地址</td><td>{$loan['address_home']}</td></tr>
<tr><td>戶籍地址</td><td>{$loan['address_residence']}</td></tr>
<tr><td>公司名稱</td><td>{$loan['company_name']}</td></tr>
<tr><td>公司地址</td><td>{$loan['company_address']}</td></tr>
<tr><td>公司電話</td><td>{$loan['company_phone']}</td></tr>
<tr><td>職稱</td><td>{$loan['job_title']}</td></tr>
<tr><td>薪資</td><td>" . number_format($loan['salary']) . "</td></tr>
<tr><td>勞健保</td><td>{$loan['labor_insurance']}</td></tr>
<tr><td>工作年資</td><td>{$loan['work_years']}</td></tr>
<tr><td>銀行信用狀況</td><td>{$loan['credit_status']}</td></tr>
</table>
";

$right = "
<h3>親友聯絡人</h3>
<table class='table-info'>
<tr><td>聯絡人1姓名</td><td>{$loan['contact1_name']}</td></tr>
<tr><td>關係</td><td>{$loan['contact1_relation']}</td></tr>
<tr><td>電話</td><td>{$loan['contact1_phone']}</td></tr>
<tr><td>聯絡人2姓名</td><td>{$loan['contact2_name']}</td></tr>
<tr><td>關係</td><td>{$loan['contact2_relation']}</td></tr>
<tr><td>電話</td><td>{$loan['contact2_phone']}</td></tr>
</table>

<h3>合約資訊</h3>
<table class='table-info'>
<tr><td>申請日期</td><td>{$loan['apply_date']}</td></tr>
<tr><td>首期應還日</td><td>{$loan['first_due_date']}</td></tr>
<tr><td>期數</td><td>{$loan['installment_count']}</td></tr>
<tr><td>每期金額</td><td>" . number_format($loan['installment_amount']) . "</td></tr>
<tr><td>合約日期</td><td>{$loan['contract_date']}</td></tr>
</table>
";

$html .= "<table class='layout-two-col'><tr><td>{$left}</td><td>{$right}</td></tr></table>";

// ==================================================
//  上傳圖片（不含簽名檔）
// ==================================================
$validImages = array_filter($files, fn($f) => $f['file_type'] !== 'signature');
$validImages = array_values($validImages);

if (!empty($validImages)) {
  $html .= "<div class='page-break'></div><h3 class='upload-title'>上傳圖片</h3>";
  for ($i = 0; $i < count($validImages); $i += 2) {
    $html .= "<table class='image-pair'><tr>";
    for ($j = 0; $j < 2; $j++) {
      $f = $validImages[$i + $j] ?? null;
      if ($f) {
        $relativePath = basename($f['file_path']); // 只取檔名
        $path = $_SERVER['DOCUMENT_ROOT'] . '/uploads/loan/' . $relativePath;
        $label = translateFileType($f['file_type']);

        if (file_exists($path)) {
          $data = base64_encode(file_get_contents($path));
          $ext = pathinfo($path, PATHINFO_EXTENSION);
          $label = translateFileType($f['file_type']);
          $html .= "
            <td>
              <div class='imgBox'>
                <div class='imgLabel'>{$label}</div>
                <div class='imgFrame'>
                  <img src='data:image/{$ext};base64,{$data}' alt='{$label}' />
                </div>
              </div>
            </td>";
        } else {
          $html .= "<td><div class='imgLabel'>{$label}（找不到檔案）</div></td>";
        }
      } else {
        $html .= "<td></td>";
      }
    }
    $html .= "</tr></table>";
  }
}

// ==================================================
//  契約書 + 簽名
// ==================================================
$html .= "<div class='page-break'></div>
<div class='note-box' style='position: relative; min-height: 800px;'>
  <div class='contract-title'>金錢消費借貸契約</div>
  <p>一、甲方願將新臺幣壹萬貳仟元整貸與乙方。</p>
  <p>二、還款日期與金額：</p>
  <p>(1) 2025/10/24：新臺幣參仟元整</p>
  <p>(2) 2025/10/31：新臺幣參仟元整</p>
  <p>(3) 2025/11/07：新臺幣參仟元整</p>
  <p>(4) 2025/11/14：新臺幣參仟元整</p>
  <p>三、乙方同意創業佳數位科技有限公司進行必要之徵信調查，並支付徵信費用參仟伍佰元整。</p>
  <p>四、開辦費：伍佰元整。</p>
  <p>五、如違反本契約，乙方應賠償懲罰性違約金伍萬元整予甲方。</p>
  <p>六、貸款核準最終解釋權歸於本公司。</p>
  <p>七、訴訟管轄法院：臺灣桃園地方法院。</p>
  <p>申貸日期：{$loan['apply_date']}</p>
  <p>首次還款日：{$loan['first_due_date']}</p>
  <p>立契約書人：</p>
  <p>貸與人：富士旺實業股份有限公司（甲方）</p>
  <p>借用人：{$loan['name']}（乙方）</p>
";

foreach ($files as $f) {
  if ($f['file_type'] === 'signature') {
    $relativePath = basename($f['file_path']);
    $path = $_SERVER['DOCUMENT_ROOT'] . '/uploads/loan/' . $relativePath;

    if (file_exists($path)) {
      $data = base64_encode(file_get_contents($path));
      $ext = pathinfo($path, PATHINFO_EXTENSION);
      $html .= "
        <div style='position:absolute; bottom:40px; left:60px; text-align:left;'>
          <h3 style='margin:0 0 6px 0;'>簽名：</h3>
          <img src='data:image/{$ext};base64,{$data}' style='width:220px; border:1px solid #999; border-radius:4px;' />
        </div>";
    }
  }
}



// ==================================================
//  輸出 PDF
// ==================================================
while (ob_get_level()) ob_end_clean();
header_remove('Access-Control-Allow-Origin');
header_remove('Access-Control-Allow-Credentials');

$mpdf->WriteHTML("<style>{$css}</style>", \Mpdf\HTMLParserMode::HEADER_CSS);
$mpdf->WriteHTML($html, \Mpdf\HTMLParserMode::HTML_BODY);

$dateStr = date('Y-m-d');
$name = preg_replace('/[^\p{L}\p{N}_]+/u', '', $loan['name'] ?? '未命名');
$phone = preg_replace('/[^\d]+/', '', $loan['phone'] ?? '未知');
$filename = "{$dateStr}_{$name}_{$phone}.pdf";

$mpdf->Output($filename, \Mpdf\Output\Destination::DOWNLOAD);
exit;
?>
