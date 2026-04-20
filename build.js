const fs = require("fs");
const path = require("path");

const textFiles = ["index.html", "styles.css", "app.js"];
const assetFiles = ["op-image.png"];
const outDir = path.join(__dirname, "dist");
const kakaoMapKey = process.env.KAKAO_MAP_KEY || "";

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of textFiles) {
  const sourcePath = path.join(__dirname, file);
  const targetPath = path.join(outDir, file);
  let content = fs.readFileSync(sourcePath, "utf8");

  if (file === "app.js") {
    content = content.replace("__KAKAO_MAP_KEY__", kakaoMapKey);
  }

  fs.writeFileSync(targetPath, content, "utf8");
}

for (const file of assetFiles) {
  const sourcePath = path.join(__dirname, file);
  const targetPath = path.join(outDir, file);
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }
}
