# WeYu Project Commit Reporter 使用說明

這是一個本機使用的日報輔助工具。它會掃描 `C:\Users\rdpuser\RiderProjects` 底下的 Git 專案，把每天已 commit 的工作整理成日報候選資料。你在網頁確認後，才會寫入 `WeyutechV6.dbo.BAS_PROJECT_MAINTAIN_DETAIL`。

網頁只開在本機：

```text
http://127.0.0.1:5147
```

## 主要功能

- 每 5 分鐘自動掃描 Git commit。
- 掃描前會先執行 `git fetch --prune`，抓遠端最新 commit。
- 排除 merge commit。
- 只產生候選資料，不會自動寫入資料庫。
- 可在網頁確認 `PROJECT_CODE`、`PROCESS_TYPE`、`SUMMARY` 後寫入。
- 可手動輸入日報，不一定要有 Git commit。
- 可設定 repo 名稱對應固定的 `PROJECT_CODE` / `PROCESS_TYPE`。
- 英文 SUMMARY 可按「翻譯繁中」轉成繁體中文。
- Windows 排程使用隱藏模式執行，不會跳出 PowerShell 視窗。

## 啟動網頁

在專案資料夾執行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-Web.ps1
```

開啟：

```text
http://127.0.0.1:5147
```

如果要指定 Port：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Run-Web.ps1 -Port 5147
```

## 第一次使用設定

### 執行需求

- Windows
- Git
- .NET 8 SDK

如果 `dotnet` 不在 PATH，可以設定：

```powershell
$env:PROJECT_REPORTER_DOTNET_EXE = "C:\Users\rdpuser\.dotnet\dotnet.exe"
```

### 1. 設定 SQL 連線字串

連線字串會用 Windows DPAPI 加密後存在本機 `data\connection-string.protected`，不會寫進程式碼。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Set-ConnectionString.ps1 -ConnectionString "Data Source=YOUR_SQL_SERVER,1433;Initial Catalog=WeyutechV6;User ID=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;Encrypt=False"
```

請把 `YOUR_PASSWORD` 換成實際密碼。

### 2. 安裝每 5 分鐘掃描排程

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-ScheduledTask.ps1 -Minutes 5
```

排程名稱：

```text
ProjectCommitReporter Commit Scan
```

排程只會產生候選資料，不會直接寫 DB。

## 畫面怎麼用

### 日報確認

日報確認分成兩個 Tab。

#### Git Commit

這裡會顯示掃描到、還沒處理的 commit。

每一筆可以做：

- 選擇 `PROJECT_CODE`
- 選擇 `PROCESS_TYPE`
- 修改 `SUMMARY`
- 按「確認寫入」
- 按「略過」
- 按「重新產生 SUMMARY」
- 按「翻譯繁中」

按「確認寫入」後才會新增到 `BAS_PROJECT_MAINTAIN_DETAIL`。

#### 手動輸入

如果某個工作沒有對應 Git commit，可以直接手 KEY。

需要填：

- 工作日期
- `PROJECT_CODE`
- `PROCESS_TYPE`
- `SUMMARY`

填完按「確認寫入」即可。

### 篩選工作台

用來管理常用對應關係。

例如：

```text
名稱：HongCheng-Smart-Scheduler
PROJECT_CODE：HC-EC(2601)
PROCESS_TYPE：20 開發Loader
```

之後如果 commit 來自 `HongCheng-Smart-Scheduler`，日報確認畫面會自動帶入這組 `PROJECT_CODE` / `PROCESS_TYPE`。

### Commit 清單

這裡是查詢用，不直接處理日報寫入。

可以依照以下條件篩選：

- 狀態
- 專案
- 作者
- 關鍵字
- 開始時間
- 結束時間

可點「查看」看 commit 詳細內容。

## 寫入資料庫規則

寫入 `dbo.BAS_PROJECT_MAINTAIN_DETAIL` 時固定套用：

```text
BAS_PROJECT_MAINTAIN_DETAIL_SID = dbo.GetSid()
PROJECT_CODE = 畫面選擇值
PROCESS_TYPE = 畫面選擇值
SUMMARY = 畫面內容
PROJECT_STATUS = '1'
COMMENT = 'autoGenerate'
PRINCIPAL_USER = 'Andy'
SUPPORT_USER = ''
REVIEWER_USER = ''
START_EXPECTED_TIME = 工作日期
START_TIME = 工作日期
EXPECTED_TIME = '1900-01-01'
END_TIME = NULL
SEQ = 0
ENABLE_FLAG = 'Y'
CREATE_USER = 'ADMINV2'
EDIT_USER = 'ADMINV2'
CREATE_TIME = GETDATE()
EDIT_TIME = GETDATE()
FILE_NAME = NULL
```

## 掃描規則

- 掃描根目錄：`C:\Users\rdpuser\RiderProjects`
- 只掃 Git repo。
- 掃描前會先 `git fetch --prune`。
- 有 upstream 時掃 upstream ref，例如 `origin/main`。
- 沒有 upstream 時掃本機 `HEAD`。
- 排除 merge commit。
- 預設只抓作者 `Andy` 的 commit。
- 同一 repo + commit SHA 不會重複產生候選。

## 常用指令

### 手動掃描

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Scan-Commits.ps1
```

### 執行測試

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test.ps1
```

### 重新安裝排程

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-ScheduledTask.ps1 -Minutes 5
```

## 常見問題

### 每 5 分鐘掃描會不會自動寫入資料庫？

不會。排程只會掃描並產生候選資料。必須在網頁按「確認寫入」才會寫 DB。

### 為什麼看不到新的 commit？

請先確認：

- commit 已經 push 到遠端。
- commit author 是 `Andy`。
- commit 不是 merge commit。
- 該 repo 有 upstream。
- 最近掃描狀態沒有 fetch 失敗。

也可以按網頁右上角「立即掃描」。

### 為什麼每次都要選 PROJECT_CODE / PROCESS_TYPE？

到「篩選工作台」建立預設對應。之後符合 repo 名稱的 commit 會自動帶入。

### 為什麼 SQL 連線失敗？

請重新設定連線字串：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Set-ConnectionString.ps1 -ConnectionString "Data Source=YOUR_SQL_SERVER,1433;Initial Catalog=WeyutechV6;User ID=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;Encrypt=False"
```

## 專案結構

```text
project-commit-reporter
├─ src
│  ├─ ProjectCommitReporter.Core    # Git 掃描、候選資料、SQL 寫入規則
│  └─ ProjectCommitReporter.Web     # 本機 Web UI 與 API
├─ tests                            # xUnit 測試
├─ scripts                          # 啟動、掃描、排程、連線設定腳本
├─ data                             # 本機狀態與加密連線字串，不應提交 Git
└─ README.md
```

## 注意事項

- `data/` 是本機資料，不要提交到 Git。
- `publish/` 是建置輸出，不要提交到 Git。
- SQL 密碼不要寫進程式碼或 README。
- 本工具預設只綁定 `127.0.0.1`，不要改成區網公開，除非已確認安全性。
