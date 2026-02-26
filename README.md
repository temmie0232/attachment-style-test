# 愛着スタイル診断（45問）

Next.js（App Router）で作成した、2択45問の愛着スタイル診断アプリです。

## 機能

- `/` トップページ（説明・免責・開始導線）
- `/test` 診断ページ（1ページで45問回答 → 結果表示ボタンで保存）
- `/result/[id]` 結果ページ（個別解説を表示）
- `/api/submit` 回答保存API（zodバリデーション + Postgres保存）
- `/admin` 管理画面（Basic認証 + 直近200件表示 + 結果表示日時/時間帯 + 回答詳細 + 削除）

## 必要な環境変数

- `POSTGRES_URL`
- `ADMIN_PASSWORD`

## セットアップ

```bash
npm install
npm run db:init
npm run dev
```

## DB初期化

`db/init.sql` にDDLがあります。`npm run db:init` は `scripts/db-init.mjs` から実行されます。
