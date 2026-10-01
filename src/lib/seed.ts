import type { User, Court, EventItem, Lesson, Evaluation } from "./types";
import { addMonths } from "./utils";

const now = new Date().toISOString();

export const seedUsers: User[] = [
  {
    id: "u-admin",
    email: "admin@padellab.com",
    name: "Superadmin Padel Lab",
    role: "superadmin",
    status: "active",
    createdAt: now,
    overall: 0,
    phone: "+55 11 90000-0001",
  },
  /** Extra superadmin for tests (app login). */
  {
    id: "u-admin-teste",
    email: "admin.teste@padellab.com",
    name: "Superadmin Teste",
    role: "superadmin",
    status: "active",
    createdAt: now,
    overall: 0,
    phone: "+351 900 000 001",
    bio: "Conta de demonstração para o painel de administração.",
  },
  {
    id: "u-prof",
    email: "professor@padellab.com",
    name: "Marina Duarte",
    role: "coach",
    status: "active",
    createdAt: now,
    overall: 0,
    phone: "+55 11 90000-0002",
    bio: "Ex-atleta profissional, foco em técnica e tática.",
  },
  /** Extra account for tests only (app login). */
  {
    id: "u-prof-teste",
    email: "prof.teste@padellab.com",
    name: "Professor Teste",
    role: "coach",
    status: "active",
    createdAt: now,
    overall: 0,
    phone: "+351 900 000 099",
    bio: "Conta de demonstração para testar o painel de professor.",
  },
  {
    id: "u-aluno",
    email: "aluno@padellab.com",
    name: "João Silva",
    role: "student",
    status: "active",
    createdAt: now,
    accessExpiresAt: addMonths(now, 3),
    overall: 0,
    phone: "+55 11 90000-0003",
  },
  {
    id: "u-pendente",
    email: "pendente@padellab.com",
    name: "Ana Costa",
    role: "student",
    status: "deactivated",
    createdAt: now,
    overall: 0,
    phone: "+55 11 90000-0004",
  },
];

export const seedCourts: Court[] = [
  {
    id: "c1",
    name: "+54",
    courtType: "Outdoor",
    courtNumber: "1",
    address: "Club Street 42 — Main hall",
    surface: "Artificial turf",
    indoor: false,
  },
  {
    id: "c2",
    name: "+54",
    courtType: "Indoor",
    courtNumber: "2",
    address: "Club Street 42 — Covered hall, door B",
    surface: "Artificial turf",
    indoor: true,
  },
  {
    id: "c3",
    name: "+54",
    courtType: "Indoor",
    courtNumber: "3",
    address: "Club Street 42 — Covered hall, door C",
    surface: "Artificial turf",
    indoor: true,
  },
];

export const seedEvents: EventItem[] = [
  {
    id: "e1",
    title: "Net volley clinic",
    date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    time: "09:00",
    venue: "Club Street 100",
    address: "Club Street 100 — reception",
    description: "Volley work at the net and positioning. Bring water.",
    createdBy: "u-prof",
    type: "clinic",
    slug: "net-volley-clinic",
  },
  {
    id: "e2",
    title: "Internal doubles tournament",
    date: new Date(Date.now() + 86400000 * 9).toISOString().slice(0, 10),
    time: "14:00",
    venue: "Indoor Court A",
    address: "",
    description: "American format. Sign-up until the day before.",
    createdBy: "u-admin",
    type: "tournament",
    slug: "internal-doubles-tournament",
  },
];

export const seedLessons: Lesson[] = [
  {
    id: "l1",
    studentId: "u-aluno",
    coachId: "u-prof",
    courtId: "c2",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "18:00",
    status: "confirmed",
    lessonActivityId: "salida-pared-dr",
  },
  {
    id: "l2",
    studentId: "u-aluno",
    coachId: "u-prof",
    courtId: "c1",
    date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    time: "10:00",
    status: "pending",
    lessonActivityId: "derecha-directa",
  },
];

export const seedEvaluations: Evaluation[] = [];
