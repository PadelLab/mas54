$ErrorActionPreference = "Stop"
$app = (Join-Path $PSScriptRoot "..\src\app" | Resolve-Path).Path

function Fix-NestedPage {
  param([string]$Nested, [string]$Target)
  $nestedPath = Join-Path $app $Nested
  $targetPath = Join-Path $app $Target
  if (-not (Test-Path -LiteralPath $nestedPath)) {
    Write-Host "SKIP: $Nested"
    return
  }
  $targetDir = Split-Path $targetPath -Parent
  if (-not (Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  }
  if (Test-Path -LiteralPath $targetPath) {
    Remove-Item -LiteralPath $targetPath -Force
  }
  Write-Host "FIX: $Nested -> $Target"
  Move-Item -LiteralPath $nestedPath -Destination $targetPath -Force
  $emptyParent = Split-Path $nestedPath -Parent
  while ($emptyParent -and $emptyParent.StartsWith($app) -and $emptyParent -ne $app) {
    $items = Get-ChildItem -LiteralPath $emptyParent -Force
    if ($items.Count -eq 0) {
      Remove-Item -LiteralPath $emptyParent -Force
      Write-Host "REMOVED empty: $($emptyParent.Replace($app + '\', ''))"
      $emptyParent = Split-Path $emptyParent -Parent
    } else {
      break
    }
  }
}

$fixes = @(
  @("teacher\students\alunos\page.tsx", "teacher\students\page.tsx"),
  @("teacher\events\eventos\page.tsx", "teacher\events\page.tsx"),
  @("teacher\classes\aulas\page.tsx", "teacher\classes\page.tsx"),
  @("teacher\activities\atividades\page.tsx", "teacher\activities\page.tsx"),
  @("teacher\activities\categories\categorias\page.tsx", "teacher\activities\categories\page.tsx"),
  @("teacher\activities\categories\[categoryId]\[categoryId]\page.tsx", "teacher\activities\categories\[categoryId]\page.tsx"),
  @("teacher\activities\[categoryId]\[categoryId]\page.tsx", "teacher\activities\[categoryId]\page.tsx"),
  @("admin\courts\list\quadras\page.tsx", "admin\courts\list\page.tsx"),
  @("admin\activities\categories\categorias\page.tsx", "admin\activities\categories\page.tsx"),
  @("admin\activities\categories\[categoryId]\[categoryId]\page.tsx", "admin\activities\categories\[categoryId]\page.tsx"),
  @("teacher\profile\perfil\page.tsx", "teacher\profile\page.tsx"),
  @("student\profile\perfil\page.tsx", "student\profile\page.tsx")
)

foreach ($pair in $fixes) {
  Fix-NestedPage -Nested $pair[0] -Target $pair[1]
}

Write-Host "Structure fixes done."
