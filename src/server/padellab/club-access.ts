import type { UserRole } from "@/lib/types";

/** Club access blocks after the Neon Auth identity is valid. */
export function clubLoginBlockedMessage(user: { role: UserRole; status: string }): string | null {
  if ((user.role === "coach" || user.role === "coach_admin") && user.status === "pending") {
    return "Conta aguardando aprovação do administrador.";
  }
  if (user.role === "student" && (user.status === "expired" || user.status === "deactivated" || user.status === "pending")) {
    return "Acesso encerrado ou conta desativada. Entre em contato com o administrador.";
  }
  if (user.role !== "student" && (user.status === "deactivated" || user.status === "expired")) {
    return "Conta desativada. Entre em contato com a administração do clube.";
  }
  return null;
}
