import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = dirname(fileURLToPath(import.meta.url));
const localPublish = resolve(desktopDir, "../site/dist");
const repositoryRoot = resolve(desktopDir, "..");
const source = existsSync(join(localPublish, "index.html"))
  ? localPublish
  : repositoryRoot;
const output = resolve(desktopDir, "web");

if (!existsSync(join(source, "index.html"))) {
  throw new Error(`找不到网页版入口文件：${source}`);
}
if (!output.startsWith(`${desktopDir}${sep}`) || output === source) {
  throw new Error(`拒绝清理非桌面构建目录：${output}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isDirectory() && ["picture", "voice", "video"].includes(entry.name)) {
    cpSync(join(source, entry.name), join(output, entry.name), { recursive: true });
  } else if (entry.isFile() && (entry.name === ".nojekyll" || [".html", ".js", ".css"].includes(extname(entry.name)))) {
    cpSync(join(source, entry.name), join(output, entry.name));
  }
}
console.log(`已准备桌面资源：${source} -> ${output}`);

