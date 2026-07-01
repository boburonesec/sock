# Paypoq OS Engineering Principles

## 1. Business First

Har qanday product yoki texnik qaror aniq biznes muammosini hal qilishi kerak. Texnologiya biznesga xizmat qiladi; biznes texnologiyaga moslashtirilmaydi.

## 2. MVP First

Agar funksiyasiz sex ishlashda davom eta olsa, u MVP tarkibiga kirmaydi. “Keyinchalik kerak bo‘lishi mumkin” — funksiyani MVP’ga kiritish uchun yetarli sabab emas.

## 3. Simplicity Over Complexity

Eng sodda, tushunarli va ishonchli yechim tanlanadi.

- Monolith microservice’dan ustun, agar alohida servis zarurati bo‘lmasa.
- Qo‘lda tasdiqlanadigan jarayon erta avtomatlashtirishdan ustun.
- Oddiy CRUD murakkab workflow engine’dan ustun.

## 4. Operator Friendly

Tizim IT mutaxassislari uchun emas. Asosiy foydalanuvchilar: smena qabul qiluvchi, omborchi, hisobchi, sotuvchi va menejer.

Asosiy ishlar 2–3 klikda bajarilishi, ekrandagi matn qisqa va tushunarli bo‘lishi kerak. Muhim holatlar rang, badge va katta ko‘rsatkichlar bilan ajratiladi.

## 5. Dark Mode First

Interfeys dark mode asosida quriladi. Light mode optional bo‘lib qoladi, ammo asosiy vizual va kontrast qarorlari dark mode uchun tekshiriladi.

## 6. Human Before IoT

V1’da ishlab chiqarish ma’lumotlarini inson kiritadi. V2’da stanok, barcode yoki boshqa IoT manbalari integratsiya qilinishi mumkin.

Bugungi development IoT sabab sekinlashtirilmaydi. Biroq domain model qo‘lda va avtomatik kiritilgan ma’lumot manbalarini kelajakda ajrata olishi kerak.

## 7. Configuration Only Where Needed

Hamma narsani sozlanadigan qilish taqiqlanadi. Faqat biznesga bevosita ta’sir qiluvchi parametrlar sozlanadi:

- Batch size
- Salary rates
- Product attributes
- Permissions

## 8. Real Factory Validation

Har bir katta modul quyidagi siklda rivojlanadi:

1. Ishlab chiqish
2. Sexda sinov
3. Foydalanuvchi feedback’i
4. Yaxshilash

Maqsad ideal tizim emas — sexda ishonchli ishlaydigan tizim yaratish.

## Amaliy qo‘llanish

Yangi funksiya boshlanishidan oldin quyidagi savollar tekshiriladi:

1. U qaysi aniq factory muammosini hal qiladi?
2. Sex uni hozir qo‘lda, lekin qabul qilinadigan tarzda bajara oladimi?
3. Operator ushbu amalni 2–3 klikda bajara oladimi?
4. Uni oddiy model yoki CRUD bilan hal qilish mumkinmi?
5. Funksiya real sexda sinalish rejasiga egami?
