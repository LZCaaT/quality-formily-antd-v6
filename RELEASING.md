# npm 发布流程

`@designable-next/formily-antd-v6` 使用 GitHub Trusted Publishing 发布，不使用本地 npm token 或 OTP。

## 发布预发布版本

1. 确认工作分支已同步且工作区干净。
2. 使用 Node.js 22 执行 `npm ci --legacy-peer-deps`、`npm test` 和 `npm run lint`。
3. 执行 `npm run version:alpha -- --yes --no-push`。Lerna 会统一更新 `lerna.json`、所有工作区版本和锁文件，并创建发布提交与 `v<version>` 标签。
4. 推送发布提交：`git push origin feat/quality-scope`。
5. 推送发布标签：`git push origin v<version>`。
6. 标签会触发 `.github/workflows/publish.yml`，依次校验版本、运行回归测试、构建、检查 npm tarball、可信发布，并从 npm 回读确认版本。

预发布版本统一发布到 `next` dist-tag，正式版本发布到 `latest`。

## 与设计器仓库的顺序

运行时组件必须先发布。`quality-designable/release.config.json` 只能填写已经存在于 npm、且有对应 Git tag 的 `formily-antd-v6` 版本。设计器发布工作流会按该版本检出运行时仓库，禁止直接使用运行时开发分支的最新代码。
