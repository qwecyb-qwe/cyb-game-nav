# CLANG!（clangclang.top）静态整站副本

从 https://clangclang.top 抓取的完整静态资源，原样保存，可直接跑起来。

## 目录

```
index.html                 # 入口（39 KB，含 UI 骨架与内联 SVG 图标）
manifest.webmanifest       # PWA：全屏、锁定横屏
assets/index-WwWq61wR.js    # 主包 5.2 MB（Vite 打包，three.js + Rapier 物理 + 全部游戏逻辑）
assets/index-B3Z_Wvdw.css  # 样式 141 KB（riso 印刷风：网点、纸纹、印章、HUD）
assets/codex-D3240_sR.js   # 懒加载分包（图鉴/Codex 页面）
assets/codex-CD3nlyt9.css
fonts/SmileySans.woff2     # 标题手写体（笑开颜体）
ui/share-square.jpg        # 分享图
```

总量 5.7 MB，无外部依赖，无外部贴图/模型（几何体与贴图全部程序化生成，Rapier 的 wasm 以 base64 内联在主包里）。

## 怎么跑

必须用 HTTP 起服务，不能双击 `file://` 打开（`<script type="module">` 会被 CORS 拦）。

```bash
cd clangclang-copy
python3 -m http.server 8090
# 浏览器打开 http://127.0.0.1:8090
```

Windows 上也可以：`npx serve .` 或 `python -m http.server 8090`。

## 硬性要求

- **WebGL2 + 硬件加速**：站点自带检测，软件渲染会直接拦在 "Software rendering detected" 页。Chrome/Edge 里打开设置 → 系统 → 使用图形加速，重启浏览器。
- 手机需横屏，首次加载 5.2 MB 主包，弱网要等几秒。
- 想改代码：主包是压缩后的，没有 `.map`，函数名已混淆。要二次开发建议用 `npx prettier --parser babel` 反格式化后再读，变量仍是短名。
