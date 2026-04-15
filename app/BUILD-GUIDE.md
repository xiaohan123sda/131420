# 随手记 App 构建指南

## 当前状态

| 项目 | 状态 |
|------|------|
| Flutter SDK | ❌ 未安装 (需手动安装) |
| App 源代码 | ✅ 已就绪 |
| GitHub Actions | ✅ 已配置 |

## 方法一：本地构建 (推荐)

### 1. 安装 Flutter SDK

下载并解压 Flutter SDK：
- 下载链接: https://docs.flutter.dev/get-started/install/windows
- 或直接下载: https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.5-stable.zip

### 2. 配置环境变量

```powershell
# 将 Flutter 添加到 PATH
# 在 PowerShell 中运行:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\flutter\bin", "User")
```

### 3. 构建 APK

```powershell
cd C:\Users\韩青利\.qclaw\workspace\projects\auto-accountant\app
flutter pub get
flutter build apk --debug
```

APK 输出位置: `build\app\outputs\flutter-apk\app-debug.apk`

---

## 方法二：GitHub Actions 云构建

项目已配置 GitHub Actions workflow (`.github/workflows/build.yml`)

### 操作步骤:

1. **推送代码到 GitHub**
   ```bash
   cd C:\Users\韩青利\.qclaw\workspace\projects\auto-accountant
   git add .
   git commit -m "Add build workflow"
   git push origin main
   ```

2. **等待自动构建**
   - 进入 GitHub 仓库 → Actions
   - 查看构建进度
   - 构建完成后下载 APK

---

## 方法三：在线编译

访问以下在线 Flutter 开发环境:
- https://replit.com/languages/flutter
- https://playcode.io/flutter
- https://codesandbox.io

将 `app/` 文件夹内容复制到在线环境即可编译。

---

## 技术支持

如需帮助，请联系开发者。