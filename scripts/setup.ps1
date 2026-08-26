$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$wranglerToml = "wrangler.toml"
$content = Get-Content $wranglerToml -Raw

# 自动创建 D1 数据库
if ($content -match 'database_id\s*=\s*"YOUR_D1_DATABASE_ID"') {
    Write-Host "Creating D1 database..." -ForegroundColor Cyan
    $output = wrangler d1 create qq-bot-db 2>&1
    Write-Host $output

    if ($output -match 'database_id\s*=\s*"([^"]+)"') {
        $dbId = $Matches[1]
        $content = $content -replace 'database_id\s*=\s*"YOUR_D1_DATABASE_ID"', "database_id = `"$dbId`""
        Set-Content $wranglerToml $content
        Write-Host "D1 database created: $dbId" -ForegroundColor Green
    } else {
        Write-Host "Failed to parse D1 database ID" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "D1 database already configured" -ForegroundColor Yellow
}

# 重新读取内容
$content = Get-Content $wranglerToml -Raw

# 自动创建 KV 命名空间
if ($content -match 'id\s*=\s*"YOUR_KV_NAMESPACE_ID"') {
    Write-Host "Creating KV namespace..." -ForegroundColor Cyan
    $output = wrangler kv namespace create KV 2>&1
    Write-Host $output

    if ($output -match 'id\s*=\s*"([^"]+)"') {
        $kvId = $Matches[1]
        $content = $content -replace 'id\s*=\s*"YOUR_KV_NAMESPACE_ID"', "id = `"$kvId`""
        Set-Content $wranglerToml $content
        Write-Host "KV namespace created: $kvId" -ForegroundColor Green
    } else {
        Write-Host "Failed to parse KV namespace ID" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "KV namespace already configured" -ForegroundColor Yellow
}

Write-Host "`nSetup complete!" -ForegroundColor Green
