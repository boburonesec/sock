export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API request failed with ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

/** The API always returns an operator-friendly Uzbek `message` (HttpExceptionFilter). */
function readServerMessage(body: unknown): string | null {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return null;
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

export function getUserFacingErrorMessage(
  error: unknown,
  context: "login" | "data" = "data",
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "API serverga ulanib bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.";
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
      readServerMessage(error.body) ??
      (error.status === 403
        ? "Bu ma'lumotni ko'rish uchun ruxsat yo'q."
        : "So'rov bajarilmadi. Ma'lumotlarni tekshirib qayta urinib ko'ring.")
    );
  }

  return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}
