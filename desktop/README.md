# 大宝Kill Windows 桌面版

这个目录用 Tauri 2 将 `../site/dist/` 中的网页发布版封装为 Windows 程序。若在公开网页仓库中构建，则直接使用仓库根目录的网页文件。桌面版使用本地打包资源，游戏内容与网页发布版保持一致。

## 构建

在 Windows 上安装 Rust MSVC 工具链、Microsoft C++ Build Tools、WebView2、Node.js 后执行：

```powershell
cd desktop
npm install
npm run tauri icon app-icon.svg
npm run build
```

安装包生成在 `src-tauri/target/release/bundle/nsis/`。使用 `npm run tauri icon app-icon.svg` 可以重新生成图标。

首次安装时，若系统缺少 WebView2，安装器会下载 Microsoft 的 WebView2 安装程序。此版本尚未进行代码签名，Windows 可能显示未知发布者提示。

