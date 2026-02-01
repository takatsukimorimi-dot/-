# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

カレンダー付き日記Webアプリケーション（個人用）

- **プラットフォーム**: Webアプリ（静的ホスティング可能）
- **データ保存**: LocalStorage / IndexedDB（サーバー不要）
- **対象ユーザー**: 個人利用（ログイン不要）

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- 画像保存: Base64エンコード or IndexedDB

## Key Features

- カレンダー表示（月単位）と日付選択
- 日記作成・編集・削除（自動保存）
- 画像添付（複数対応、リサイズ・圧縮）
- タグ・カテゴリ管理
- キーワード検索・タグフィルタ・期間指定
- データのエクスポート/インポート（JSON形式）

## Data Structure

```javascript
DiaryEntry {
  id: string,
  date: string,        // YYYY-MM-DD
  title: string,
  content: string,
  tags: string[],
  images: string[],    // Base64
  createdAt: number,
  updatedAt: number
}

Tag {
  id: string,
  name: string,
  color: string
}
```

## Development

ローカルで開発する場合、任意のHTTPサーバーで配信:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve
```

## Browser Support

Chrome, Firefox, Safari, Edge（最新2バージョン）
