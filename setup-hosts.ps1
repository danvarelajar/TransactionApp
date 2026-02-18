# PowerShell script to add domain entries to hosts file
# Usage: .\setup-hosts.ps1 [payment_domain] [attacker_domain]

param(
    [string]$PaymentDomain = "payment.fortinet.demo",
    [string]$AttackerDomain = "attacker.fortinet.demo"
)

$HostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$Entries = @()

Write-Host "Adding domains to $HostsFile:" -ForegroundColor Cyan
Write-Host "  - $PaymentDomain" -ForegroundColor Yellow
Write-Host "  - $AttackerDomain" -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires administrator privileges." -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Read existing hosts file
if (Test-Path $HostsFile) {
    $Entries = Get-Content $HostsFile
}

# Check and add payment domain
if ($Entries -match [regex]::Escape($PaymentDomain)) {
    Write-Host "⚠️  $PaymentDomain already exists in hosts file" -ForegroundColor Yellow
} else {
    Add-Content -Path $HostsFile -Value "127.0.0.1    $PaymentDomain"
    Write-Host "✅ Added $PaymentDomain" -ForegroundColor Green
}

# Check and add attacker domain
if ($Entries -match [regex]::Escape($AttackerDomain)) {
    Write-Host "⚠️  $ATTACKER_DOMAIN already exists in hosts file" -ForegroundColor Yellow
} else {
    Add-Content -Path $HostsFile -Value "127.0.0.1    $AttackerDomain"
    Write-Host "✅ Added $AttackerDomain" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! You can now start Docker with: docker compose up --build" -ForegroundColor Green
