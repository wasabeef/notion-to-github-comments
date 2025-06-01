# Contributing to Notion PR AI Context

🎉 **コントリビューションを歓迎します！** Pull Request の提出をお気軽にお願いします。

## 🛠️ Development Setup

### 前提条件

- [Bun](https://bun.sh/) のインストール
- Node.js 18+ (Bun と互換性のあるバージョン)
- Git

### 開発環境のセットアップ

1. **リポジトリをクローン**:

   ```bash
   git clone https://github.com/wasabeef/notion-pr-ai-context.git
   cd notion-pr-ai-context
   ```

2. **依存関係をインストール**:

   ```bash
   bun install
   ```

3. **プロジェクトをビルド**:

   ```bash
   bun run build
   ```

4. **テストを実行**:

   ```bash
   bun run test
   ```

5. **Lint を実行**:

   ```bash
   bun run lint
   ```

## 📁 Project Structure

```text
notion-pr-ai-context/
├── src/
│   ├── index.ts           # Main entry point
│   ├── notion-client.ts   # Notion API integration
│   ├── github-client.ts   # GitHub API integration
│   └── url-extractor.ts   # URL parsing utilities
├── tests/
│   └── url-extractor.test.ts  # Unit tests
├── .github/
│   └── workflows/
│       ├── ci.yml         # CI pipeline (test, lint, build)
│       ├── test.yml       # Action testing workflow
│       └── release.yml    # Release automation
├── dist/                  # Built JavaScript files (generated on release)
├── action.yml             # GitHub Action metadata
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## 🔄 Development Workflow

### 1. 機能開発

1. **ブランチ作成**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **開発・テスト**:
   ```bash
   bun run test     # テスト実行
   bun run lint     # コード品質チェック
   bun run build    # ビルド確認
   ```

3. **Pull Request 作成**: GitHub でPRを作成

### 2. テスト

- **Unit Tests**: `bun run test` でURL抽出ロジックをテスト
- **Integration Tests**: `.github/workflows/test.yml` で実際のAction動作をテスト
- **CI Tests**: すべてのプルリクエストでCI piplineが自動実行

### 3. コード品質

- **TypeScript**: 型安全性を保つため、型エラーを修正してください
- **ESLint**: `bun run lint` でコードスタイルを確認
- **Prettier**: コードフォーマットの統一

## 🏷️ Release Process & Tagging

このプロジェクトは **リリース時自動化** を採用しています。

### リリースフロー

1. **開発完了**: `main` ブランチに変更をマージ
2. **タグ作成**: バージョンタグを作成してプッシュ
3. **自動化実行**: GitHub Actions が自動で：
   - TypeScript をビルドして `dist/` ファイル生成
   - `dist/` をタグにコミット
   - GitHub Release を自動公開

### タグ規則

#### 通常リリース
```bash
# 例: v1.2.3
git tag v1.2.3
git push origin v1.2.3
```

#### プレリリース (自動検出)
```bash
# ハイフンが含まれると自動的にプレリリースとして公開
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1

git tag v1.2.3-alpha.2  
git push origin v1.2.3-alpha.2
```

#### メジャーバージョンタグ
```bash
# GitHub Action使用時の利便性のため
git tag v1  # v1.x.x の最新を指す
git push origin v1
```

### `dist/` ディレクトリ管理

- **開発時**: `dist/` は `.gitignore` で除外、管理しない
- **リリース時**: Release ワークフローが自動でビルド & コミット
- **利点**: 
  - 開発時のマージコンフリクト回避
  - CI の簡素化
  - GitHub Action のベストプラクティス準拠

### バージョニング規則

[Semantic Versioning](https://semver.org/) に従います：

- **MAJOR** (`v2.0.0`): 破壊的変更
- **MINOR** (`v1.1.0`): 後方互換性のある新機能
- **PATCH** (`v1.0.1`): 後方互換性のあるバグ修正

## 🧪 Testing Guidelines

### Unit Tests

```bash
# URL extraction tests
bun run test
```

### Integration Tests

```bash
# GitHub Actions でのテスト (手動実行可能)
gh workflow run test.yml
```

### 新機能のテスト

1. **Unit Test 追加**: `tests/` ディレクトリに適切なテストを追加
2. **Integration Test**: 実際のNotion URLでAction動作を確認
3. **Edge Case**: エラーハンドリングのテスト

## 📝 Pull Request Guidelines

### PR作成時

1. **明確な説明**: 変更内容と理由を記載
2. **関連Issue**: 関連するIssueがあれば言及
3. **テスト**: 適切なテストを含める
4. **Breaking Changes**: 破壊的変更がある場合は明記

### PR例

```markdown
## 概要
新しいNotion URL形式のサポートを追加

## 変更内容
- カスタムドメインのサポート追加
- URL抽出ロジックの改善
- 新しいテストケース追加

## テスト
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing completed

## 破壊的変更
なし
```

## 🐛 Issue Reporting

バグや改善提案がある場合：

1. **既存Issue確認**: 重複を避けるため既存Issueを確認
2. **詳細な情報**: 再現手順、期待される動作、実際の動作
3. **環境情報**: OS、Node.js/Bunバージョン等
4. **ログ**: 関連するエラーログやスクリーンショット

## 🙏 Code of Conduct

このプロジェクトに参加する全ての人が尊重される環境を維持するため：

- 建設的なフィードバックを心がける
- 多様性を尊重する
- 親切で丁寧なコミュニケーション
- 学習と成長を促進する環境作り

## 🎯 Development Roadmap

今後の開発予定：

- [ ] より多くのNotion block typeサポート
- [ ] パフォーマンス最適化
- [ ] 国際化(i18n)サポート
- [ ] カスタムマークダウンテンプレート

ご質問やサポートが必要な場合は、お気軽に [Issue](https://github.com/wasabeef/notion-pr-ai-context/issues) を作成してください！ 