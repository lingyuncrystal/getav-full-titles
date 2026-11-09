# GetAV网站脚本（getav-full-titles）

适用于 [GetAV](https://getav.net/) 的油猴（Tampermonkey / Violentmonkey）用户脚本：

- **视频标题完整显示**：解除全站标题的单行截断与省略号，长标题自动换行完整展示；对仍被截断的元素自动展开，并用 `title` 属性补全文字。
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

## 版本

当前版本：**1.7.0**，详见 [CHANGELOG](./CHANGELOG.md)。

## 许可证

[MIT](./LICENSE)
