$ErrorActionPreference = "Stop"
$appRoot = Join-Path $PSScriptRoot "..\src\app" | Resolve-Path

function Move-Route {
  param([string]$From, [string]$To)
  $fromPath = Join-Path $appRoot $From
  $toPath = Join-Path $appRoot $To
  if (-not (Test-Path -LiteralPath $fromPath)) {
    Write-Host "SKIP (missing): $From"
    return
  }
  $toDir = Split-Path $toPath -Parent
  if ($toDir -and -not (Test-Path -LiteralPath $toDir)) {
    New-Item -ItemType Directory -Path $toDir -Force | Out-Null
  }
  Write-Host "MOVE: $From -> $To"
  Move-Item -LiteralPath $fromPath -Destination $toPath -Force
}

$phase1 = @(
  @("cadastro", "register"),
  @("aluno", "student"),
  @("professor", "teacher"),
  @("categoria", "category"),
  @("opcao-b", "option-b"),
  @("opcao-c", "option-c"),
  @("admin/perfil", "admin/profile"),
  @("admin/usuarios", "admin/users"),
  @("admin/alunos", "admin/students"),
  @("admin/aulas", "admin/classes"),
  @("admin/atividades", "admin/activities"),
  @("admin/quadras", "admin/courts"),
  @("admin/eventos", "admin/events"),
  @("admin/programacao", "admin/schedule"),
  @("admin/acessos", "admin/access")
)

foreach ($pair in $phase1) {
  Move-Route -From $pair[0] -To $pair[1]
}

$phase2 = @(
  @("settings/security/redefinir", "settings/security/reset"),
  @("login/recuperar", "login/recover"),
  @("login/redefinir", "login/reset"),
  @("register/aluno", "register/student"),
  @("register/professor", "register/teacher"),
  @("admin/profile/editar", "admin/profile/edit"),
  @("admin/users/acessos", "admin/users/access"),
  @("admin/users/administradores", "admin/users/administrators"),
  @("admin/users/alunos", "admin/users/students"),
  @("admin/users/professores", "admin/users/teachers"),
  @("admin/users/novo", "admin/users/new"),
  @("admin/users/equipa", "admin/users/team"),
  @("admin/classes/estado/[status]", "admin/classes/status/[status]"),
  @("admin/activities/catalogo", "admin/activities/catalog"),
  @("admin/activities/resumo", "admin/activities/summary"),
  @("admin/activities/categorias/nova", "admin/activities/categories/new"),
  @("admin/activities/categorias/[categoryId]/nova-atividade", "admin/activities/categories/[categoryId]/new-activity"),
  @("admin/activities/categorias/[categoryId]", "admin/activities/categories/[categoryId]"),
  @("admin/activities/categorias", "admin/activities/categories"),
  @("admin/courts/nova", "admin/courts/new"),
  @("admin/courts/quadras/[courtId]", "admin/courts/list/[courtId]"),
  @("admin/courts/quadras", "admin/courts/list"),
  @("admin/events/novo", "admin/events/new"),
  @("admin/events/[id]/participantes", "admin/events/[id]/participants"),
  @("student/agendar", "student/book"),
  @("student/conta", "student/account"),
  @("student/perfil/editar", "student/profile/edit"),
  @("student/perfil", "student/profile"),
  @("student/programacao", "student/schedule"),
  @("student/eventos", "student/events"),
  @("teacher/perfil/editar", "teacher/profile/edit"),
  @("teacher/perfil", "teacher/profile"),
  @("teacher/alunos/[studentId]/overall", "teacher/students/[studentId]/overall"),
  @("teacher/alunos/[studentId]", "teacher/students/[studentId]"),
  @("teacher/alunos", "teacher/students"),
  @("teacher/eventos/[id]/participantes", "teacher/events/[id]/participants"),
  @("teacher/eventos/novo", "teacher/events/new"),
  @("teacher/aulas/estado/[status]", "teacher/classes/status/[status]"),
  @("teacher/aulas/estado", "teacher/classes/status"),
  @("teacher/aulas", "teacher/classes"),
  @("teacher/eventos/agenda", "teacher/events/agenda"),
  @("teacher/eventos", "teacher/events"),
  @("teacher/atividades/categorias/[categoryId]/nova-atividade", "teacher/activities/categories/[categoryId]/new-activity"),
  @("teacher/atividades/categorias/[categoryId]", "teacher/activities/categories/[categoryId]"),
  @("teacher/atividades/categorias/nova", "teacher/activities/categories/new"),
  @("teacher/atividades/categorias", "teacher/activities/categories"),
  @("teacher/atividades/[categoryId]/nova-atividade", "teacher/activities/[categoryId]/new-activity"),
  @("teacher/atividades/[categoryId]", "teacher/activities/[categoryId]"),
  @("teacher/atividades/nova", "teacher/activities/new"),
  @("teacher/atividades", "teacher/activities"),
  @("teacher/programacao", "teacher/schedule")
)

foreach ($pair in $phase2) {
  Move-Route -From $pair[0] -To $pair[1]
}

$sobre = Join-Path $appRoot "option-b\sobre"
if (Test-Path -LiteralPath $sobre) {
  Remove-Item -LiteralPath $sobre -Recurse -Force
  Write-Host "REMOVED empty: option-b/sobre"
}

Write-Host "Done renaming folders."
