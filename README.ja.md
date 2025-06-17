# Notion to GitHub Comments

[![GitHub release](https://img.shields.io/github/release/wasabeef/notion-to-github-comments.svg)](https://github.com/wasabeef/notion-to-github-comments/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="README.md">English</a>
</p>

Pull Request の説明文から Notion ページやデータベースの情報を自動的に抽出し、Markdown 形式に変換して、PR コメントとして AI が利用しやすいコンテキストを投稿する GitHub Action です。

## 🚀 特徴

- **自動検出**: PR 説明文の Notion URL をスキャンしてコンテンツを取得
- **AI フレンドリー出力**: Notion コンテンツを AI ツールや LLM 用のクリーンな Markdown に変換
- **スマートコメント**: 折りたたみセクションでコンテンツを投稿、自動更新
- **エラー処理**: アクセス不可や無効リンクを適切に処理

## 💡 動機

複数の AI エージェントをコードレビューに使用する場合、各エージェントが Notion ドキュメントを個別に取得することで API コストが倍增し、セットアップも複雑になります。

このアクションは Notion コンテンツを一度取得して PR コメントに投稿することで、すべての AI エージェントが追加の API 呼び出しなしに即座にアクセスできるようにします。

**利点:** コスト効率、エージェントごとのセットアップ不要、即時アクセス、一貫したコンテキスト。

## 📋 前提条件

- 参照したいページ/データベースが存在する Notion ワークスペース
- API アクセス権を持つ Notion インテグレーション
- Actions が有効になっている GitHub リポジトリ

## 🛠️ セットアップ

### ステップ 1: Notion インテグレーションの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセスします。
2. 「New integration」をクリックします。
3. インテグレーションの詳細を入力します。
   - **Name**: インテグレーション名 (例: "GitHub PR Comments")
   - **Workspace**: ワークスペースを選択します。
   - **Capabilities**: 「Read content」をチェックします (他の機能は不要です)。
4. 「Submit」をクリックし、**Internal Integration Token** をコピーします。
5. **重要**: このトークンは GitHub Secrets で使用するため、安全に保管してください。

### ステップ 2: Notion ページ/データベースの共有

アクセスしたい各 Notion ページまたはデータベースに対して:

1. Notion でページまたはデータベースを開きます。
2. 右上の「Share」をクリックします。
3. 「Invite」をクリックし、インテグレーション名を検索します。
4. インテグレーションを選択し、「Invite」をクリックします。

**📝 注意**: PR で参照したい各ページ/データベースを個別に共有する必要があります。子ページは自動的に権限を継承します。

### ステップ 3: GitHub リポジトリの設定

1. GitHub リポジトリに移動します。
2. **Settings** → **Secrets and variables** → **Actions** に移動します。
3. **New repository secret** をクリックします。
4. 次のシークレットを追加します。
   - **Name**: `NOTION_TOKEN`
   - **Value**: ステップ 1 で取得した Notion インテグレーションのトークン

**🔒 セキュリティ**: Notion トークンをリポジトリに直接コミットしないでください。常に GitHub Secrets を使用してください。

### ステップ 4: ワークフローファイルの作成

リポジトリに `.github/workflows/notion-to-github-comments.yml` を作成します。

```yaml
name: Notion to PR Comments

on:
  pull_request:
    types: [opened, edited]

jobs:
  add-notion-comments:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write # コメント投稿に必要
      contents: read # PR 説明文の読み取りに必要
    steps:
      - name: Add Notion Content to PR
        uses: wasabeef/notion-to-github-comments@v1.2.0
        with:
          notion-token: ${{ secrets.NOTION_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📖 使い方

セットアップが完了すると、Action は自動的に以下を実行します。

1. PR がオープンまたは編集されたときに、**PR の説明文をスキャン**して Notion URL を探します。
2. リンクされた Notion ページとデータベースから**コンテンツを抽出**します。
3. 適切なフォーマットで **Markdown に変換**します。
4. URL ごとに折りたたみ可能なセクションを持つ**コメントとして投稿**します。

### PR 説明文の例

```markdown
## 概要

この PR は、新しいユーザー Authentication フローを実装します。

## 関連ドキュメント

- 設計仕様: https://www.notion.so/yourworkspace/auth-design-123abc
- API ドキュメント: https://notion.so/yourworkspace/api-docs-456def
```

### 生成されるコメント

Action は以下のようなコメントを作成します。

<img width="919" alt="Screenshot 2025-06-01 at 16 38 14" src="https://github.com/user-attachments/assets/19009bcf-7e19-4746-965b-fa606472bcf1" />

````markdown
### 🤖 Notion Context (2 link(s) processed)

<details>
<summary>&nbsp;&nbsp;📄 User Authentication Design</summary>

```markdown
# User Authentication Flow

## Overview

This document outlines the authentication system...
```

</details>
````

## 🔧 設定

### Inputs

| Input          | 説明                                    | 必須 | デフォルト                    |
| -------------- | --------------------------------------- | ---- | ----------------------------- |
| `notion-token` | Notion API インテグレーションのトークン | ✅   | -                             |
| `github-token` | コメント投稿用の GitHub トークン        | ✅   | `${{ secrets.GITHUB_TOKEN }}` |

### サポートされる Notion コンテンツ

- **ページ**: ネストされたブロックを含む完全なページコンテンツ
- **データベース**: 表示されているすべてのプロパティを含むテーブル形式
- **ネストされたコンテンツ**: 子ページとブロック (API の制限まで)

## 🔍 トラブルシューティング

### 一般的な問題

1. **"Failed to fetch Notion content"**

   - Notion ページ/データベースがインテグレーションと共有されていることを確認してください。
   - `NOTION_TOKEN` シークレットが正しく設定されていることを確認してください。
   - PR の説明文にある URL がアクセス可能であることを確認してください。

2. **"No Notion URLs found"**

   - URL が (コメントだけでなく) PR の説明文に含まれていることを確認してください。
   - URL の形式を確認してください - `https://notion.so/...` または `https://www.notion.so/...` である必要があります。

3. **"Insufficient permissions"**
   - GitHub Actions が `pull-requests: write` 権限を持っていることを確認してください。
   - ブランチ保護ルールが Action をブロックしていないか確認してください。

## 🤝 コントリビューション

コントリビューションを歓迎します。詳細については [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 📝 ライセンス

このプロジェクトは MIT License のもとでライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🐛 Issues & サポート

問題が発生した場合や質問がある場合は:

1. [Issues](https://github.com/wasabeef/notion-to-github-comments/issues) ページを確認してください。
2. 詳細情報とともに新しい Issue を作成してください。
3. 関連するログと設定を含めてください。

## 🙏 謝辞

- [Notion API](https://developers.notion.com/) - インテグレーションプラットフォームの提供
- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Markdown 変換
- GitHub Actions コミュニティ - インスピレーションとベストプラクティス
