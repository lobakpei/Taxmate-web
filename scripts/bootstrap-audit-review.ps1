$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $PSScriptRoot
Push-Location -LiteralPath $sourceRoot
try {
  $nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
  if ($LASTEXITCODE -ne 0 -or $nodeMajor -lt 22) {
    throw 'Node.js 22 or newer is required.'
  }

  $npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source

  & $npmCommand ci
  if ($LASTEXITCODE -ne 0) { throw 'Root npm ci failed.' }

  & $npmCommand ci --prefix functions
  if ($LASTEXITCODE -ne 0) { throw 'Functions npm ci failed.' }

  Write-Output 'TAXMATE_AUDIT_BOOTSTRAP_PASS root_dependencies=installed functions_dependencies=installed'
}
finally {
  Pop-Location
}
