# スマスロ ハイエナ判定 PWA（オンライン版）

GitHub Pages用の完全静的サイトです。

## 変更点
- Service Worker / `sw.js` を削除
- `manifest.json` を削除
- `pwa.js` を削除
- オフラインキャッシュ機能を削除
- OCRはTesseract.jsをCDNからオンライン読み込み
- 判定履歴・機種選択はブラウザのlocalStorageに保存

## GitHub Pages
1. このフォルダ内のファイルをGitHubリポジトリにアップロード
2. Settings → Pages
3. Deploy from a branch
4. Branch: main / root
5. Save
6. 発行されたURLをSafariで開く

## 注意
OCRはオンライン接続が必要です。OCR結果は必ず画面で確認してください。
