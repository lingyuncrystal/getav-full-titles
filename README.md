# GetAV网站脚本（getav-full-titles）

适用于 [GetAV](https://getav.net/) 的油猴（Tampermonkey / Violentmonkey）用户脚本：

- **视频标题完整显示**：解除全站标题的单行截断与省略号，长标题自动换行完整展示；对仍被截断的元素自动展开，并用 `title` 属性补全文字。
- **列表页标题放大**：首页/分类/搜索等列表页（非详情页、非订阅页）的标题字号自动加大一号。
- **订阅页三列美化**：仅在「我的订阅」页生效，把订阅列表改造为网格卡片布局（宽屏 3 列 / 窄屏 2 列），头像居中、名字最多两行居中显示，卡片带悬浮高亮效果；中文名与日文原名相同时自动隐藏重复项。
- **动态加载适配**：通过 MutationObserver 监听页面动态内容，滚动加载的新内容同样生效。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）扩展。
2. 点击脚本文件 [getav-full-titles.user.js](./getav-full-titles.user.js) 的 Raw 链接，扩展会自动弹出安装界面；或将文件内容复制到扩展中手动新建脚本。
3. 打开 `getav.net` 任意页面即可生效。

## 生效范围

```
*://getav.net/*
*://*.getav.net/*
```

## 实现说明

| 模块 | 说明 |
| --- | --- |
| 全局样式 | 注入 CSS，解除 `white-space: nowrap` / `text-overflow: ellipsis` / `-webkit-line-clamp` 等截断规则 |
| 订阅页网格 | 识别订阅列表容器并标记为 `#getav-sub-grid`，套用 Grid 卡片样式 |
| 卡片内联修正 | 对卡片内链接区、名字容器、按钮设置内联样式，根治竖排与换行问题 |
| 截断展开 | 运行时检测 `scrollWidth/scrollHeight` 超出且被截断的元素，强制展开 |
| title 补全 | 元素文本被省略号截断时，用其 `title` 属性还原完整文字 |
| 列表页标题放大 | 列表页标题运行时读取计算字号放大 1.12 倍（11–20px 内），WeakSet 保证只放大一次 |

## 版本

当前版本：**1.7.3**，详见 [CHANGELOG](./CHANGELOG.md)。

## 发布流程

### 原理

Sleazyfork 没有写入 API，官方支持的自动发布方式是「从 URL 同步 + GitHub Webhook」：

```
push 到 main → GitHub 触发 webhook → Sleazyfork 抓取 raw 文件 → @version 更新时才发布
```

### 一次性配置（只需做一次）

1. 登录 Sleazyfork，打开本脚本的管理页 → **Syncing（同步）设置**：
   - 同步方式选 **Webhook**；
   - 同步地址填 raw 文件地址（注意是 `raw` 地址，不能是 `/blob/` 页面地址）：
     ```
     https://raw.githubusercontent.com/lingyuncrystal/getav-full-titles/main/getav-full-titles.user.js
     ```
2. 保存后页面会生成本脚本专属的 Webhook URL 和 Secret，复制它们：
   - 到 GitHub 仓库 **Settings → Webhooks → Add webhook**：Payload URL 填该地址，Secret 填生成的密钥，Content type 选 `application/json`，只勾 **push** 事件；
   - ✅ 本仓库的 webhook 已配置完成（2026-11-09，测试推送已验证通过），此步无需再做。
3. 点一次「Sync now」验证 Sleazyfork 能抓到文件。

### 日常发布（改完代码一键发布）

1. 修改 `getav-full-titles.user.js`， bump 头部的 `@version`，并在 `CHANGELOG.md` 添加对应条目；
2. 运行：

   ```bash
   ./scripts/publish.sh            # 可加提交说明：./scripts/publish.sh "fix: 修复xxx"
   ```

   脚本会自动完成：语法检查 → 校验版本号必须大于上一个 tag → 补全 CHANGELOG 日期 → 提交 → 打 tag → 推送 GitHub；
3. push 后几秒内 GitHub 触发 webhook，Sleazyfork 完成同步（**仅当 `@version` 比线上新时才发布新版本**）。 若 Sleasyfork 几分钟内没更新，到 GitHub 仓库 **Settings → Webhooks → Sleazyfork 那条 → Recent Deliveries** 查看投递状态，失败点 **Redeliver** 重投即可。

先用 `./scripts/publish.sh --dry-run` 可以只检查不发布。

## 许可证

[MIT](./LICENSE)
