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

export function getUserFacingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "API serverga ulanib bo'lmadi. Internet yoki API_BASE_URL sozlamasini tekshiring.";
    }

    if (error.status === 401) {
      return "Email yoki parol noto'g'ri.";
    }

    if (error.status === 403) {
      return "Sizning akkauntingiz xodim profiliga ulanmagan.";
    }

    if (error.status >= 500) {
      return "Serverda vaqtinchalik xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.";
    }

    return "So'rov bajarilmadi. Ma'lumotlarni tekshirib qayta urinib ko'ring.";
  }

  return "Kutilmagan xatolik yuz berdi. Qayta urinib ko'ring.";
}
