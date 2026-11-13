// ==UserScript==
// @name         GetAV 视频标题完整显示 + 订阅页三列美化
// @namespace    https://getav.net/
// @license      MIT
// @icon         https://getav.net/favicon.ico
// @version      1.7.4
// @description  完整显示视频标题不再省略；列表页标题字号加大一号；仅在“我的订阅”页把订阅列表改为网格卡片（宽屏3列/窄屏2列），名字两行居中显示
// @match        *://getav.net/*
// @match        *://*.getav.net/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const isSubscriptionsPage = /\/profile\/subscriptions/.test(location.pathname);

    /* ===== 共享常量 ===== */
    const ENLARGE_FACTOR = 1.12; // 列表页标题放大倍率（实测约大一号，再大卡片会拥挤）
    const MIN_FONT_SIZE = 11;    // 只放大正文级标题：跳过更小的辅助文字
    const MAX_FONT_SIZE = 20;    // 跳过页面大标题
    const DEBOUNCE_MS = 300;     // MutationObserver 高频回调的防抖间隔

    /**
     * querySelectorAll 的补充：动态加载时新增节点本身可能也匹配选择器，
     * 而 querySelectorAll 只查后代，需要把 root 自身一并纳入。
     */
    function queryAllWithSelf(root, selector) {
        const list = [...(root || document).querySelectorAll(selector)];
        if (root && root.nodeType === 1 && typeof root.matches === 'function' && root.matches(selector)) {
            list.unshift(root);
        }
        return list;
    }

    /* ===== 模块一：全局样式（解除单行截断，所有页面） ===== */
    let css = `
        a[title], h1, h2, h3, h4, .title, .video-title, [class*="title"],
        [class*="Title"], [class*="name"], [class*="Name"] {
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: unset !important;
            text-overflow: clip !important;
            -webkit-line-clamp: unset !important;
            -webkit-box-orient: unset !important;
            display: block !important;
            word-break: break-word !important;
            word-wrap: break-word !important;
            max-height: none !important;
            height: auto !important;
        }
        [class*="card"], [class*="item"], [class*="video"], [class*="post"],
        article, li, .entry {
            overflow: visible !important;
        }
    `;

    if (isSubscriptionsPage) {
        css += `
        /* ============ 订阅页：网格 ============ */
        #getav-sub-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 20px !important;
            border: none !important;
            width: 100% !important;
            padding: 8px 0 16px !important;
        }
        /* 窄屏（手机等宽度不够时）两列 */
        @media (max-width: 700px) {
            #getav-sub-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 14px !important;
            }
            #getav-sub-grid > div { padding: 14px !important; }
            #getav-sub-grid > div > a.flex .rounded-full {
                width: 60px !important;
                height: 60px !important;
            }
            #getav-sub-grid p.truncate { font-size: 13px !important; }
        }

        /* ============ 卡片本体 ============ */
        #getav-sub-grid > div {
            position: relative;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 18px !important;
            background: linear-gradient(165deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 60%, rgba(255,255,255,0.03) 100%) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 16px !important;
            transition: transform .22s cubic-bezier(.34,1.4,.5,1),
                        border-color .22s ease,
                        box-shadow .22s ease,
                        background .22s ease;
        }
        #getav-sub-grid > div:hover {
            transform: translateY(-4px);
            border-color: rgba(244,63,94,0.4) !important;
            background: linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 60%, rgba(244,63,94,0.04) 100%) !important;
            box-shadow: 0 12px 32px rgba(0,0,0,0.45),
                        0 0 0 1px rgba(244,63,94,0.10),
                        0 4px 16px rgba(244,63,94,0.08) !important;
        }

        /* ============ 头像：顶部居中 + 悬浮光环 ============ */
        #getav-sub-grid > div > a.flex .rounded-full {
            width: 72px !important;
            height: 72px !important;
            margin: 2px auto 0 !important;
            transition: box-shadow .22s ease, border-color .22s ease !important;
        }
        #getav-sub-grid > div:hover > a.flex .rounded-full {
            border-color: rgba(244,63,94,0.55) !important;
            box-shadow: 0 0 0 3px rgba(244,63,94,0.16),
                        0 0 14px rgba(244,63,94,0.28) !important;
        }

        /* ============ 链接区：竖排居中（头像在上，名字在下） ============ */
        #getav-sub-grid > div > a.flex {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            width: 100% !important;
            gap: 10px !important;
            text-align: center !important;
            text-decoration: none !important;
        }
        /* 名字容器：显式撑满整行（不再依赖 flex 伸展，根治竖排问题） */
        #getav-sub-grid > div > a.flex > div.min-w-0 {
            width: 100% !important;
            min-width: 0 !important;
            text-align: center !important;
        }
        /* 中文名：最多两行，居中 */
        #getav-sub-grid p.truncate {
            font-size: 14px !important;
            font-weight: 600 !important;
            letter-spacing: 0.01em !important;
            line-height: 1.35 !important;
            color: #fff !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: unset !important;
            text-align: center !important;
        }
        /* 日文原名：小字居中 */
        #getav-sub-grid p.truncate + p {
            font-size: 11px !important;
            letter-spacing: 0.04em !important;
            color: rgba(255,255,255,0.40) !important;
            margin-top: 3px !important;
            text-align: center !important;
            white-space: normal !important;
            overflow: visible !important;
        }
        /* 卡片悬浮时名字高亮 */
        #getav-sub-grid > div:hover p.truncate {
            text-shadow: 0 0 12px rgba(244,63,94,0.35) !important;
        }

        /* ============ 取消订阅按钮 ============ */
        #getav-sub-grid > div > button {
            width: 100% !important;
            display: inline-flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            margin-top: auto !important;
            padding: 9px 0 !important;
            font-size: 13px !important;
            letter-spacing: 0.1em !important;
            border-radius: 9999px !important;
            border: 1px solid rgba(255,255,255,0.10) !important;
            background: rgba(255,255,255,0.04) !important;
            color: rgba(255,255,255,0.62) !important;
            transition: all .2s ease !important;
        }
        #getav-sub-grid > div > button:hover {
            border-color: rgba(244,63,94,0.5) !important;
            background: rgba(244,63,94,0.12) !important;
            color: #fda4af !important;
            box-shadow: 0 2px 14px rgba(244,63,94,0.25) !important;
            transform: translateY(-1px);
        }
        #getav-sub-grid > div > button:active {
            transform: scale(0.97);
        }
        #getav-sub-grid > div > button svg {
            flex-shrink: 0 !important;
            margin-right: 6px !important;
            transition: transform .2s ease !important;
        }
        #getav-sub-grid > div > button:hover svg {
            transform: scale(1.12) rotate(-6deg);
        }
        `;
    }

    const style = document.createElement('style');
    style.id = 'getav-full-title-style';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);

    /* ===== 模块二：订阅页网格卡片（标记容器 + 内联样式固定布局） ===== */
    // 注意：这里的内联样式与模块一 CSS 中的规则【有意重复】——
    // 站点自身大量使用内联样式，纯 CSS 规则打不赢优先级，必须双保险。
    function styleCards() {
        document.querySelectorAll('#getav-sub-grid > div').forEach(card => {
            const anchor = card.querySelector(':scope > a.flex');
            const btn = card.querySelector(':scope > button');

            if (anchor) {
                // 链接区：竖排居中
                anchor.style.setProperty('display', 'flex', 'important');
                anchor.style.setProperty('flex-direction', 'column', 'important');
                anchor.style.setProperty('align-items', 'center', 'important');
                anchor.style.setProperty('justify-content', 'flex-start', 'important');
                anchor.style.setProperty('width', '100%', 'important');
                anchor.style.setProperty('gap', '10px', 'important');
                anchor.style.setProperty('text-align', 'center', 'important');

                // 名字容器：显式 100% 宽，居中（根治竖排）
                const textDiv = anchor.querySelector(':scope > div.min-w-0');
                if (textDiv) {
                    textDiv.style.setProperty('width', '100%', 'important');
                    textDiv.style.setProperty('min-width', '0', 'important');
                    textDiv.style.setProperty('text-align', 'center', 'important');
                    textDiv.style.setProperty('flex', 'none', 'important');
                }
                // 名字/日文名：正常换行、居中
                const ps = anchor.querySelectorAll('p');
                ps.forEach(p => {
                    p.style.setProperty('white-space', 'normal', 'important');
                    p.style.setProperty('overflow', 'visible', 'important');
                    p.style.setProperty('text-overflow', 'unset', 'important');
                    p.style.setProperty('text-align', 'center', 'important');
                    p.style.setProperty('max-width', '100%', 'important');
                });
                // 日文名和中文名完全相同时，隐藏日文名（避免重复，如“友田彩也香”）
                if (ps.length >= 2 &&
                    ps[0].textContent.trim() === ps[1].textContent.trim()) {
                    ps[1].style.setProperty('display', 'none', 'important');
                }
            }

            if (btn) {
                btn.style.setProperty('width', '100%', 'important');
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.style.setProperty('flex-direction', 'row', 'important');
                btn.style.setProperty('flex-wrap', 'nowrap', 'important');
                btn.style.setProperty('white-space', 'nowrap', 'important');
                btn.style.setProperty('align-items', 'center', 'important');
                btn.style.setProperty('justify-content', 'center', 'important');
                btn.style.setProperty('margin-top', 'auto', 'important');
                btn.style.setProperty('box-sizing', 'border-box', 'important');
                const svg = btn.querySelector('svg');
                if (svg) svg.style.setProperty('flex-shrink', '0', 'important');
            }
        });
    }

    function makeThreeColumns() {
        if (!isSubscriptionsPage) return;
        const containers = document.querySelectorAll('div.divide-y');
        for (const c of containers) {
            if (c.id === 'getav-sub-grid') continue;
            const rows = Array.from(c.children).filter(
                el => el.matches && el.matches('div.flex.flex-col')
            );
            if (rows.length >= 3) {
                c.id = 'getav-sub-grid';
            }
        }
        styleCards();
    }

    /* ===== 模块三：展开仍被截断的元素 ===== */
    function expandTruncated(root) {
        const els = queryAllWithSelf(root, 'a, span, div, p, h1, h2, h3, h4, li');
        for (const el of els) {
            if (el.children.length > 3) continue;
            if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
                const cs = getComputedStyle(el);
                if (cs.whiteSpace === 'nowrap' || cs.textOverflow === 'ellipsis' ||
                    cs.overflow === 'hidden' || cs.webkitLineClamp !== 'none') {
                    el.style.setProperty('white-space', 'normal', 'important');
                    el.style.setProperty('overflow', 'visible', 'important');
                    el.style.setProperty('text-overflow', 'clip', 'important');
                    el.style.setProperty('-webkit-line-clamp', 'unset', 'important');
                    el.style.setProperty('display', 'block', 'important');
                    el.style.setProperty('max-height', 'none', 'important');
                    el.style.setProperty('height', 'auto', 'important');
                }
            }
        }
    }

    /* ===== 模块四：用 title 属性补全文字 ===== */
    function fillFromTitle(root) {
        const els = queryAllWithSelf(root, 'a[title]');
        for (const el of els) {
            const t = el.getAttribute('title');
            if (t && (el.textContent.includes('…') || el.textContent.includes('...') ||
                el.textContent.trim().length < t.trim().length / 2)) {
                el.textContent = t;
            }
        }
    }

    /* ===== 模块五：列表页标题字号大一号 ===== */
    const enlargedTitles = new WeakSet();
    function enlargeListTitles(root) {
        // 订阅页有专门的名字样式，视频详情页（/videos/番号）不在此列，其余（首页/分类/搜索等）都算列表页
        if (isSubscriptionsPage) return;
        if (/\/videos\//i.test(location.pathname)) return;
        const els = queryAllWithSelf(
            root,
            'a[title], h1, h2, h3, h4, .title, .video-title, [class*="title"], [class*="Title"]'
        );
        for (const el of els) {
            if (enlargedTitles.has(el)) continue;
            if (el.closest('#getav-sub-grid')) continue;
            const size = parseFloat(getComputedStyle(el).fontSize);
            // 只对正文级别的标题放大，跳过大标题和极小字。
            // 确认放大后才标记进 WeakSet：脚本是 document-start 运行，
            // 首次检查时站点 CSS 可能未加载完，若先标记，
            // 字号暂时不在区间内的元素会被永久跳过（时序 bug）
            if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
                el.style.setProperty('font-size', Math.round(size * ENLARGE_FACTOR) + 'px', 'important');
                enlargedTitles.add(el);
            }
        }
    }

    /* ===== 模块六：监听动态加载与启动 ===== */
    let timer = null;
    let pendingRoots = []; // 收集新增节点：只扫变化子树，避免每次变动都全文档强制同步布局
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const roots = pendingRoots.length ? pendingRoots.splice(0) : [document];
            // 新增节点过多（整页重渲染）时退化为一次全文档扫描，反而更省
            const targets = roots.length > 20 ? [document] : roots;
            for (const root of targets) {
                fillFromTitle(root);
                expandTruncated(root);
                enlargeListTitles(root);
            }
            makeThreeColumns();
        }, DEBOUNCE_MS);
    };
    const mo = new MutationObserver((muts) => {
        let hasAdded = false;
        for (const m of muts) {
            if (!m.addedNodes.length) continue;
            hasAdded = true;
            for (const n of m.addedNodes) {
                if (n.nodeType === Node.ELEMENT_NODE) pendingRoots.push(n);
            }
        }
        if (hasAdded) schedule();
    });

    function boot() {
        fillFromTitle(document);
        expandTruncated(document);
        enlargeListTitles(document);
        makeThreeColumns();
        mo.observe(document.body, { childList: true, subtree: true });
    }

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', boot)
        : boot();
    window.addEventListener('load', schedule);
})();
