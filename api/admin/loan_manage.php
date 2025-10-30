<?php
// ==================================================
// loan_manage.php — 後台貸款管理 API（CORS + Session 最終修正版）
// ==================================================

// === 安全設定 ===
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/loan_manage_error.log');
error_reporting(E_ALL);

// ==================================================
// ✅ 導入統一 Session + CORS 模組（同層 init_session.php）
// ==================================================
$initPath = __DIR__ . '/init_session.php';
if (!file_exists($initPath)) {
  error_log("[CORS] 致命錯誤：找不到 init_session.php ($initPath)");
  header('Access-Control-Allow-Origin: *');
  echo json_encode(['success' => false, 'error' => '找不到 init_session.php']);
  exit;
}
require_once $initPath;
error_log("[CORS] 已成功載入 init_session.php");

// ==================================================
// ✅ 驗證登入狀態
// ==================================================
if (empty($_SESSION['user'])) {
  error_log("[AUTH] 未登入或登入已過期");
  echo json_encode(['success' => false, 'error' => '未登入或登入已過期']);
  exit;
}

error_log("[AUTH] 已登入使用者：" . ($_SESSION['user']['username'] ?? '未知'));

// ==================================================
// ✅ 資料庫連線
// ==================================================
require_once __DIR__ . '/../../config/Database.php';
$db = new Database();
$conn = $db->getConnection();
if (!$conn) {
  echo json_encode(['success' => false, 'error' => '資料庫連線失敗']);
  exit;
}

// ==================================================
// ✅ 主邏輯控制（action）
// ==================================================
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

try {
  switch ($action) {

    // ==================================================
    // 🔹 取得貸款列表
    // ==================================================
    case 'list':
      $keyword = trim($_GET['keyword'] ?? '');
      $sql = "SELECT * FROM loan_applications";
      $params = [];

      if ($keyword !== '') {
        $sql .= " WHERE name LIKE :kw OR phone LIKE :kw OR application_no LIKE :kw";
        $params[':kw'] = "%$keyword%";
      }

      $sql .= " ORDER BY updated_at DESC LIMIT 200";
      $stmt = $conn->prepare($sql);
      $stmt->execute($params);
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

      echo json_encode(['success' => true, 'count' => count($rows), 'data' => $rows], JSON_UNESCAPED_UNICODE);
      break;

    // ==================================================
    // 🔹 取得所有選項（依類別分組）
    // ==================================================
    case 'get_options':
      $stmt = $conn->prepare("SELECT category, value, label FROM loan_options WHERE active = 1 ORDER BY category, sort_order");
      $stmt->execute();
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

      $grouped = [];
      foreach ($rows as $r) {
        $grouped[$r['category']][] = [
          'value' => $r['value'],
          'label' => $r['label']
        ];
      }

      echo json_encode(['success' => true, 'data' => $grouped], JSON_UNESCAPED_UNICODE);
      break;

    // ==================================================
    // 🔹 單筆查詢
    // ==================================================
    case 'get':
      $id = intval($_GET['id'] ?? 0);
      if (!$id) throw new Exception('缺少 ID');

      $stmt = $conn->prepare("SELECT * FROM loan_applications WHERE id = :id");
      $stmt->execute([':id' => $id]);
      $row = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$row) throw new Exception('找不到資料');
      echo json_encode(['success' => true, 'data' => $row], JSON_UNESCAPED_UNICODE);
      break;

    // ==================================================
    // 🔹 新增貸款資料
    // ==================================================
    case 'create':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data) throw new Exception('缺少資料');

      $sql = "INSERT INTO loan_applications (
        application_no, name, phone, id_number, loan_status, note, step, status, created_at, updated_at
      ) VALUES (
        :application_no, :name, :phone, :id_number, :loan_status, :note, 1, 'created', NOW(), NOW()
      )";

      $stmt = $conn->prepare($sql);
      $ok = $stmt->execute([
        ':application_no' => $data['application_no'] ?? uniqid('LN'),
        ':name' => $data['name'] ?? '',
        ':phone' => $data['phone'] ?? '',
        ':id_number' => $data['id_number'] ?? '',
        ':loan_status' => $data['loan_status'] ?? '待審核',
        ':note' => $data['note'] ?? ''
      ]);

      echo json_encode(['success' => $ok], JSON_UNESCAPED_UNICODE);
      break;

    // ==================================================
    // 🔹 更新貸款資料
    // ==================================================
    case 'update':
      $data = json_decode(file_get_contents('php://input'), true);
      if (!$data || !isset($data['id'])) throw new Exception('缺少資料');

      $fields = [
        'name','phone','step','status','note','consented_at','apply_date','first_due_date',
        'installment_count','installment_amount','schedule_json','contract_html','contract_date',
        'sign_image_path','id_number','line_id','dob','address_home','holder_home',
        'address_residence','holder_residence','company_name','company_address','company_phone',
        'job_title','salary','labor_insurance','work_years','credit_status','has_credit_card',
        'has_bank_loan','has_financing_loan','has_personal_loan','debt_detail',
        'contact1_name','contact1_relation','contact1_phone','contact2_name',
        'contact2_relation','contact2_phone','application_no','loan_status'
      ];

      $set = [];
      $params = [];
      foreach ($fields as $f) {
        if (array_key_exists($f, $data)) {
          $set[] = "`$f` = :$f";
          $params[":$f"] = $data[$f];
        }
      }
      $params[':id'] = $data['id'];
      if (!$set) throw new Exception('沒有可更新的欄位');

      $sql = "UPDATE loan_applications SET " . implode(',', $set) . ", updated_at = NOW() WHERE id = :id";
      $stmt = $conn->prepare($sql);
      $ok = $stmt->execute($params);

      echo json_encode(['success' => $ok], JSON_UNESCAPED_UNICODE);
      break;

    // ==================================================
    // 🔹 刪除貸款資料
    // ==================================================
    case 'delete':
      $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);
      if (!$id) throw new Exception('缺少 ID');

      $conn->beginTransaction();
      $conn->prepare('DELETE FROM loan_application_files WHERE application_id = :id')->execute([':id' => $id]);
      $conn->prepare('DELETE FROM loan_applications WHERE id = :id')->execute([':id' => $id]);
      $conn->commit();

      echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
      break;

    default:
      throw new Exception("未知動作：$action");
  }

} catch (Throwable $e) {
  error_log('[loan_manage.php] ' . $e->getMessage());
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => '伺服器錯誤：' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
