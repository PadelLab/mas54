$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".." | Resolve-Path
Set-Location $root

$replacements = @(
  @("/admin/atividades/categorias/", "/admin/activities/categories/"),
  @("/admin/atividades/catalogo", "/admin/activities/catalog"),
  @("/admin/atividades/resumo", "/admin/activities/summary"),
  @("/admin/atividades/categorias", "/admin/activities/categories"),
  @("/admin/atividades", "/admin/activities"),
  @("/admin/quadras/quadras/", "/admin/courts/list/"),
  @("/admin/quadras/nova", "/admin/courts/new"),
  @("/admin/quadras/quadras", "/admin/courts/list"),
  @("/admin/quadras", "/admin/courts"),
  @("/admin/eventos/novo", "/admin/events/new"),
  @("/admin/eventos/agenda", "/admin/events/agenda"),
  @("/admin/eventos/", "/admin/events/"),
  @("/admin/eventos", "/admin/events"),
  @("/admin/aulas/estado/", "/admin/classes/status/"),
  @("/admin/aulas/estado", "/admin/classes/status"),
  @("/admin/aulas", "/admin/classes"),
  @("/admin/usuarios/novo", "/admin/users/new"),
  @("/admin/usuarios/acessos", "/admin/users/access"),
  @("/admin/usuarios/administradores", "/admin/users/administrators"),
  @("/admin/usuarios/professores", "/admin/users/teachers"),
  @("/admin/usuarios/alunos", "/admin/users/students"),
  @("/admin/usuarios", "/admin/users"),
  @("/admin/perfil/editar", "/admin/profile/edit"),
  @("/admin/perfil", "/admin/profile"),
  @("/admin/programacao", "/admin/schedule"),
  @("/admin/acessos", "/admin/access"),
  @("/admin/alunos", "/admin/students"),
  @("/professor/atividades/categorias/", "/teacher/activities/categories/"),
  @("/professor/atividades/categorias", "/teacher/activities/categories"),
  @("/professor/atividades/", "/teacher/activities/"),
  @("/professor/atividades", "/teacher/activities"),
  @("/professor/eventos/novo", "/teacher/events/new"),
  @("/professor/eventos/agenda", "/teacher/events/agenda"),
  @("/professor/eventos/", "/teacher/events/"),
  @("/professor/eventos", "/teacher/events"),
  @("/professor/aulas/estado/", "/teacher/classes/status/"),
  @("/professor/aulas/estado", "/teacher/classes/status"),
  @("/professor/aulas", "/teacher/classes"),
  @("/professor/programacao", "/teacher/schedule"),
  @("/professor/alunos", "/teacher/students"),
  @("/professor/perfil/editar", "/teacher/profile/edit"),
  @("/professor/perfil", "/teacher/profile"),
  @("/professor", "/teacher"),
  @("/aluno/agendar", "/student/book"),
  @("/aluno/programacao", "/student/schedule"),
  @("/aluno/eventos", "/student/events"),
  @("/aluno/perfil/editar", "/student/profile/edit"),
  @("/aluno/perfil", "/student/profile"),
  @("/aluno/overall", "/student/overall"),
  @("/aluno", "/student"),
  @("/cadastro/professor", "/register/teacher"),
  @("/cadastro/aluno", "/register/student"),
  @("/cadastro", "/register"),
  @("/login/recuperar", "/login/recover"),
  @("/login/redefinir", "/login/reset"),
  @("/settings/security/redefinir", "/settings/security/reset"),
  @("/opcao-b", "/option-b"),
  @("/opcao-c", "/option-c"),
  @("/categoria/", "/category/"),
  @("/categoria", "/category"),
  @("nova-atividade", "new-activity"),
  @("/participantes", "/participants"),
  @("/editar", "/edit"),
  @("/perfil", "/profile"),
  @("/categorias/nova", "/categories/new"),
  @("/categorias/", "/categories/"),
  @("/categorias", "/categories"),
  @("@/app/admin/aulas/", "@/app/admin/classes/"),
  @("origem=professores", "origem=teachers"),
  @("origem=administradores", "origem=administrators"),
  @('"professores"', '"teachers"'),
  @('"administradores"', '"administrators"'),
  @("=== `"professores`"", "=== `"teachers`""),
  @("=== `"administradores`"", "=== `"administrators`""),
  @("? `"professores`"", "? `"teachers`""),
  @(": `"professores`"", ": `"teachers`""),
  @("? `"administradores`"", "? `"administrators`""),
  @(": `"administradores`"", ": `"administrators`""),
  @("/usuarios/professores", "/users/teachers"),
  @("/usuarios/administradores", "/users/administrators"),
  @("/usuarios/alunos", "/users/students"),
  @("/usuarios/novo", "/users/new"),
  @("/usuarios/acessos", "/users/access"),
  @("/usuarios", "/users"),
  @("/programacao", "/schedule"),
  @("/agendar", "/book"),
  @("/quadras/", "/courts/list/"),
  @("/quadras", "/courts"),
  @("/recuperar", "/recover"),
  @("/redefinir", "/reset"),
  @("/estado/", "/status/"),
  @("/estado", "/status"),
  @("/novo", "/new"),
  @("/nova", "/new"),
  @("/acessos", "/access"),
  @("/alunos/", "/students/"),
  @("/alunos", "/students"),
  @("/aulas/", "/classes/"),
  @("/aulas", "/classes"),
  @("/atividades/", "/activities/"),
  @("/atividades", "/activities")
)

$files = Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx,*.md -File
$changed = 0
foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName)
  $original = $content
  foreach ($pair in $replacements) {
    $content = $content.Replace($pair[0], $pair[1])
  }
  # Regex-specific updates
  $content = $content -replace '/\\\/perfil\(\/|\$\)/', '/\\/profile(\/|$)/'
  $content = $content -replace '/\\\/editar\\\/?\$', '/\\/edit\\/?$'
  $content = $content -replace '\$\{pathname\.replace\(/\\\/\$/, ""\)\}/editar', '${pathname.replace(/\\/$/, "")}/edit'
  if ($content -ne $original) {
    [System.IO.File]::WriteAllText($file.FullName, $content)
    $changed++
    Write-Host "Updated: $($file.FullName.Replace($root.Path + '\', ''))"
  }
}

Write-Host "Updated $changed files."
