import type { RequestContextSnapshot } from "@/lib/auth/request-context";
import { readApiErrorMessage } from "@paypoq/shared";

export class SessionStorageError extends Error {
  constructor() {
    super("Sessiyani qurilmada saqlab bo'lmadi. Qayta urining. Chiqish saqlanmagan bo'lsa, ilova ma'lumotlarini tozalang.");
    this.name = "SessionStorageError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`API request failed with ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export type MutationOutcome = "succeeded" | "failed" | "unknown";

export class ContextChangedError extends ApiError {
  readonly origin: RequestContextSnapshot;
  readonly outcome: MutationOutcome;

  constructor(origin: RequestContextSnapshot, outcome: MutationOutcome = "unknown") {
    const name = origin.factoryName ?? "Oldingi korxona";
    const result = outcome === "succeeded" ? "So'rov bajarildi." : outcome === "failed" ? "So'rov bajarilmadi." : "Amal bajarilgan bo'lishi mumkin.";
    super(409, "Context Changed", { message: `${name}: ${result} Korxona yoki akkaunt o'zgardi. Natijani o'sha korxonada tekshiring.` });
    this.origin = origin;
    this.outcome = outcome;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/**
 * `login` and `data` describe reads; `action` describes a write. A write that
 * times out may still have been applied by the server, so the operator is told
 * to check the result before repeating it instead of blindly retrying.
 */
export type ErrorContext = "login" | "data" | "action";

/** The API always returns an operator-friendly Uzbek `message` (HttpExceptionFilter). */
export function getUserFacingErrorMessage(
  error: unknown,
  context: ErrorContext = "data",
): string {
  if (error instanceof SessionStorageError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return context === "action"
        ? "Serverdan javob kelmadi. Amal bajarilgan bo'lishi mumkin — ro'yxatni yangilab tekshiring, keyin qayta urining."
        : "API serverga ulanib bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.";
    }

    if (error.status === 401) {
      return context === "login"
        ? "Email yoki parol noto'g'ri."
        : "Sessiya tugadi. Iltimos, qayta kiring.";
    }

    if (error.status === 429) {
      return "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.";
    }

    if (error.status >= 500) {
      return "Serverda vaqtinchalik xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.";
    }

    return (
      readApiErrorMessage(error.body) ??
      (error.status === 403
        ? "Bu amal uchun ruxsatingiz yo'q."
        : "So'rov bajarilmadi. Ma'lumotlarni tekshirib qayta urinib ko'ring.")
    );
  }

  return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}
