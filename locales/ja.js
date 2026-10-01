export default {
  nav_dashboard: 'ダッシュボード', nav_medical: '医療', nav_account: 'アカウント',
  dash_title: 'ダッシュボード', card_status: 'カードの状態', active: '有効', inactive: '無効',
  card_id: 'カードID', card_url: 'カードURL', copy_url: 'URLをコピー', view_card: 'カードを見る',
  qr_title: 'QRコード', download_qr: 'QRをダウンロード',
  nfc_title: 'NFCカードに書き込む', nfc_desc: 'スマホを空のNFCカードに触れさせて、このボタンを押してください。',
  write_nfc: 'NFCに書き込む', nfc_registered: 'このカードはNFCに登録済みです。',
  no_card_title: 'カードがまだありません', no_card_desc: 'カードを作成してCard IDと書き込みURLを取得しましょう。',
  create_card: 'カードを作成',

  acct_title: 'アカウント', notif_title: '通知',
  notif_empty_title: '通知はまだありません', notif_empty_desc: 'カードに関する重要なお知らせがここに表示されます。',
  back: '戻る', close: '閉じる', cancel: 'キャンセル', retry: '再試行', failed: '失敗: ', logout: 'ログアウト',

  greet: 'こんにちは、{name}さん！', greet_anon: 'こんにちは！', greet_desc: '緊急データとカードのプライバシーをここで管理できます。',
  menu_security: 'セキュリティ', menu_settings: '設定', menu_help: 'ヘルプセンター',
  menu_cs: 'Exigentサポートに連絡', menu_legal: '法的情報', menu_about: 'Exigent-Oneについて', menu_logout: 'ログアウト',

  set_gmail: 'アカウント情報', set_idcard: 'IDカード情報', set_language: '言語設定',
  set_permissions: '権限と詳細設定', set_deactivate: 'カードを無効化', set_activate: 'カードを有効化',
  set_logout: 'ログアウト', set_no_card: 'カードがありません', set_card_error: 'カードデータを読み込めません',
  deact_q: 'カードを無効化しますか？', deact_desc: '再有効化するまでカードページを開けません。',
  card_updated: 'カードの状態を更新しました',
  logout_q: 'ログアウトしますか？', logout_desc: 'カードを管理するには再度ログインが必要です。',

  lang_changed: '言語を日本語に変更しました',

  gmail_name: '名前', gmail_email: 'メール', gmail_method: 'ログイン方法', gmail_prov_email: 'メール',
  gmail_created: 'アカウント作成日', gmail_last: '最終ログイン',
  gmail_note: 'このアカウントはメール＆パスワードでログインしているため、Googleの名前はありません。',

  idc_empty_title: 'カードがまだありません', idc_empty_desc: 'ダッシュボードからカードを作成しましょう。',
  idc_go: 'ダッシュボードへ', idc_status: '状態', idc_nfc: 'NFCカード', idc_nfc_yes: '登録済み', idc_nfc_no: '未書き込み',
  idc_created: '作成日', copied: 'URLをコピーしました', copy_manual: 'URLを手動でコピーしてください',

  sec_password: 'パスワード', sec_new_pw: '新しいパスワード', sec_confirm_pw: '新しいパスワード（確認）', sec_save_pw: 'パスワードを保存',
  sec_pw_short: 'パスワードは6文字以上必要です。', sec_pw_mismatch: 'パスワードが一致しません。', sec_pw_saved: 'パスワードを更新しました',
  sec_google_note: 'Googleでログイン中です。パスワードと2段階認証はGoogleアカウントで管理されます。',
  sec_google_manage: 'Googleアカウントを管理',
  sec_others: '他のデバイスからログアウト', sec_others_desc: 'このデバイス以外のセッションをすべて終了します。',
  sec_others_q: '他のデバイスからログアウトしますか？', sec_others_body: '他のスマホやブラウザのセッションが終了されます。',
  sec_others_ok: 'ログアウト', sec_others_done: '他のデバイスからログアウトしました',

  perm_vis_title: '緊急カードに表示する項目',
  perm_all: 'すべて許可', perm_all_desc: 'すべてのデータを一括で表示/非表示します。',
  perm_medical: '医療データ', perm_medical_desc: '血液型、アレルギー、持病、メモ。',
  perm_address: '住所', perm_address_desc: '自宅の住所。',
  perm_contacts: '緊急連絡先', perm_contacts_desc: '救助者が電話できる連絡先。',
  perm_device_title: 'デバイスの権限',
  perm_geo: '位置情報（GPS）', perm_geo_desc: '最寄りの医療機関を探すのに使います。',
  perm_nfc: 'NFCアクセス', perm_nfc_desc: 'カードURLをNFCカードに書き込むのに使います。',
  perm_checking: '確認中…', perm_granted: '許可済み', perm_denied: '拒否', perm_prompt: '未確認', perm_unknown: 'このブラウザでは不明',
  perm_request: '権限をリクエスト',
  perm_hint: 'ブラウザはサイトから権限を直接変更させません。「拒否」になっている場合、ブラウザのサイト設定から有効にしてください。',

  help_contact_q: '答えが見つかりませんか？', help_back: 'ヘルプメニューに戻る', help_missing: 'このヘルプページは見つかりません。',
  cs_desc: 'ご都合の良いチャンネルをお選びください。',

  legal_privacy: 'プライバシーポリシー', legal_terms: '利用規約', legal_desc: 'Exigent-Oneの利用に関する公式文書。',
  about_tagline: '必要なときに、あなたの大切な情報を。',
  about_desc: '血液型、アレルギー、緊急連絡先を1枚のカードに。NFC対応スマホをかざすだけで、アプリ不要で数秒以内に表示されます。',
}
