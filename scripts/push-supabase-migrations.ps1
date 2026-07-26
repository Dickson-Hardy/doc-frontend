[CmdletBinding()]
param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$supabaseDirectory = Join-Path $repositoryRoot 'supabase'
$migrationDirectory = Join-Path $supabaseDirectory 'migrations'
$linkedProjectFile = Join-Path $supabaseDirectory '.temp\linked-project.json'
$originalAccessToken = $env:SUPABASE_ACCESS_TOKEN

function Invoke-Supabase {
  param(
    [Parameter(Mandatory)]
    [string[]]$CommandArguments
  )

  & $script:cliCommand @script:cliPrefix @CommandArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed: supabase $($CommandArguments -join ' ')"
  }
}

if (-not (Test-Path -LiteralPath $migrationDirectory)) {
  throw "Migration directory not found: $migrationDirectory"
}

if ([string]::IsNullOrWhiteSpace($ProjectRef) -and (Test-Path -LiteralPath $linkedProjectFile)) {
  $linkedProject = Get-Content -LiteralPath $linkedProjectFile -Raw | ConvertFrom-Json
  $ProjectRef = $linkedProject.ref
}

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  $ProjectRef = Read-Host 'Supabase project reference'
}

if ([string]::IsNullOrWhiteSpace($ProjectRef)) {
  throw 'A Supabase project reference is required.'
}

$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCli) {
  $script:cliCommand = $supabaseCli.Source
  $script:cliPrefix = @()
} else {
  $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npx) {
    $npx = Get-Command npx -ErrorAction SilentlyContinue
  }
  if (-not $npx) {
    throw 'Supabase CLI is not installed and npx is unavailable. Install Node.js or Supabase CLI first.'
  }

  $script:cliCommand = $npx.Source
  $script:cliPrefix = @('--yes', 'supabase@2.109.1')
}

try {
  if ([string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN)) {
    $secureToken = Read-Host 'Supabase personal access token' -AsSecureString
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    try {
      $env:SUPABASE_ACCESS_TOKEN =
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    }
  }

  if ([string]::IsNullOrWhiteSpace($env:SUPABASE_ACCESS_TOKEN)) {
    throw 'SUPABASE_ACCESS_TOKEN is required.'
  }

  Push-Location $repositoryRoot
  try {
    Write-Host "Linking Supabase project $ProjectRef..."
    Invoke-Supabase @('link', '--project-ref', $ProjectRef)

    $pushArguments = @('db', 'push', '--linked', '--include-all')
    if ($DryRun) {
      $pushArguments += '--dry-run'
      Write-Host 'Checking pending migrations without applying them...'
    } else {
      Write-Host 'Applying pending migrations...'
    }

    Invoke-Supabase $pushArguments

    if ($DryRun) {
      Write-Host 'Dry run completed successfully.'
    } else {
      Write-Host 'Supabase migrations applied successfully.'
    }
  } finally {
    Pop-Location
  }
} finally {
  if ($null -eq $originalAccessToken) {
    Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  } else {
    $env:SUPABASE_ACCESS_TOKEN = $originalAccessToken
  }
}
