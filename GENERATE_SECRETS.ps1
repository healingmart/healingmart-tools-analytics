function New-RandomHex([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

Write-Host "ANALYTICS_HASH_SALT="(New-RandomHex 32)
Write-Host "ADMIN_TOKEN="(New-RandomHex 32)
Write-Host ""
Write-Host "위 두 값을 Vercel Environment Variables에 각각 저장하세요."
