# Telegram Client Bot v1

## Maqsad

Telegram Client Bot v1 clientlarga o‘z ma’lumotlarini read-only ko‘rish imkonini
beradi:

- buyurtmalar
- qarzdorlik
- to‘lovlar

Bot hech qanday buyurtma, to‘lov yoki boshqa biznes amal yaratmaydi.

## Arxitektura

Client bot alohida bot emas. Mavjud `apps/bot` runtime kengaytirildi:

```text
apps/bot
```

Bot backend internal endpointlarni chaqiradi va databasega bevosita ulanmaydi.
Qarzdorlik projectioni backendda hisoblanadi; bot faqat natijani ko‘rsatadi.

## Backend internal endpointlar

Endpointlar `x-bot-api-key` bilan himoyalangan:

```text
GET /telegram/bot/client/orders
GET /telegram/bot/client/debt
GET /telegram/bot/client/payments
```

Har bir endpoint `telegramUserId` orqali ACTIVE `TelegramAccount type=CLIENT`
topadi va faqat shu clientga tegishli ma’lumotni qaytaradi.

## Bot commandlari

```text
/orders
/debt
/payments
```

Behavior:

- Faqat private chatda ishlaydi.
- CLIENT hisob uchun client commandlari ishlaydi.
- EMPLOYEE hisob uchun employee commandlari ishlaydi.
- Noto‘g‘ri account type commandi xavfsiz xabar qaytaradi.
- Group chatlarda sensitive data ko‘rsatilmaydi.

## Link flow

Client uchun link code web app’da `/sales/clients` details drawer orqali
yaratiladi.

1. Client details drawer ochiladi.
2. `Telegram kod yaratish` bosiladi.
3. Kod clientga yuboriladi.
4. Client Telegram botda `/link CODE` yuboradi.
5. Bot CLIENT account sifatida ulanadi.

## Security qoidalari

- Internal endpointlar public emas.
- Raw link code log qilinmaydi.
- Reversed payments client payment list va debt projectiondan chiqariladi.
- Client boshqa client ma’lumotini ko‘ra olmaydi.
- Read-only only.

## Cheklovlar

- Client to‘lov yaratolmaydi.
- Client buyurtma yaratolmaydi.
- Client profili yoki telefon orqali auth yo‘q.
- Rate limiting faqat `/link` urinishlariga qo‘llanadi.
- Webhook deployment hali yo‘q.

## Smoke test

Tekshirilgan flow:

1. Client link code yaratish.
2. Synthetic Telegram userni CLIENT sifatida link qilish.
3. `/telegram/bot/client/orders` chaqirish.
4. `/telegram/bot/client/debt` chaqirish.
5. `/telegram/bot/client/payments` chaqirish.
6. Client uchun employee-only endpoint rad etilishini tekshirish.
7. Employee uchun client-only endpoint rad etilishini tekshirish.
