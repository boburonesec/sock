# Paypoq OS — UI Specification v1

Version: 1.0

## Global UI rules

- Dark mode standart; light mode optional.
- Matn minimal, sonlar katta va holatlar aniq bo‘ladi.
- Asosiy factory amali ko‘pi bilan 2–3 klikda yakunlanadi.
- Statuslar rangli badge va warning holatlari bilan ko‘rsatiladi.
- Operatorlar uchun muhim ma’lumot birinchi ekranda, jadvalga yashirilmagan holda beriladi.

## 1. Executive Dashboard

**Maqsad:** Owner va Manager biznes holatini 10 soniyada tushunishi.

- Yo‘l: `/dashboard/executive`
- Actorlar: Owner, Manager
- Yuqori qism: 8 tadan oshmaydigan KPI cards
- O‘rta qism: Production Trend va Monthly Sales Trend
- Pastki qism: Top Products va Top Clients

KPI’lar: bugungi ishlab chiqarish, ombor qiymati, client debt, supplier debt, oylik sotuv, oylik xarajat, faol buyurtma va faol xodim.

Amallar: Reports, Sales va Production’ni ochish. Birinchi ekranda jadval bo‘lmaydi.

## 2. Operations Dashboard

**Maqsad:** factory operatsiyalarini kuzatish.

- Yo‘l: `/dashboard/operations`
- Actor: Manager
- Yuqori qism: bosqich kartalari — sahifaning asosiy vizuali
- O‘rta qism: Production Trend
- Pastki qism: Worker Productivity va Bottleneck Analysis

Bosqich kartalari: Averlog, Dazmol, Sifat, Kiydirish, Par Dazmol, Parlash, Bezak, Etiketka, Qadoqlash, Ombor. Har kartada miqdor, kunlik o‘zgarish va warning holati bo‘ladi.

Amallar: bosqich tafsilotlari hamda Production Board’ni ochish.

## 3. Production Board

**Maqsad:** factory production control center.

- Yo‘l: `/production`
- Actorlar: Manager, Shift Receiver
- Chap panel: bugungi/haftalik ishlab chiqarish va faol xodimlar
- Markaz: Stage Inventory Board — bosqich, miqdor va mahsulot kesimi
- O‘ng panel: tezkor amallar

Tezkor amallar va majburiy maydonlar:

| Amal | Majburiy maydonlar |
| --- | --- |
| Create Batch | Product Variant, Quantity |
| Move Stage | Source Stage, Destination Stage, Quantity |
| Add Activity | Employee, Stage, Quantity |
| Register Defect | Employee, Stage, Quantity, Reason |

Bu tizimning eng muhim sahifasi. Har bir yuqoridagi amal ko‘pi bilan uch klikda boshlanishi kerak.

## 4. Employees

**Maqsad:** xodimlarni boshqarish.

- Yo‘l: `/employees`
- Actor: Manager
- Asosiy layout: Employee Table + Employee Details Drawer

Jadval ustunlari: Name, Role, Status, Today’s Activity, Monthly Activity, Current Payroll.

Drawer tablari: Activities, Payroll, Bonuses, Penalties, Advances.

Amallar: xodim yaratish, tahrirlash, deaktivatsiya, bonus va jarima qo‘shish. Xodim tafsilotlari alohida sahifaga o‘tmasdan drawer’da ochilishi shart.

## 5. Orders

**Maqsad:** buyurtmalarni boshqarish.

- Yo‘l: `/sales/orders`
- Actorlar: Seller, Manager
- Asosiy layout: Order Table + Order Details Drawer

Jadval ustunlari: Order Number, Client, Amount, Status, Deadline.

Drawer ichida: Products, Payments va Timeline.

Amallar: create, edit, confirm va cancel order.

Buyurtma yaratish wizard bilan bajariladi:

1. Client
2. Products
3. Review
4. Create

## 6. Payroll

**Maqsad:** ish haqi boshqaruvi.

- Yo‘l: `/finance/payroll`
- Actorlar: Accountant, Manager
- Layout: Payroll Period List + Employee Payroll Table

Payroll davr jadvali: Month, Status, Total Payroll.

Employee Payroll jadvali: Employee, Activity Amount, Bonuses, Penalties, Advances, Final Salary.

Amallar: Calculate Payroll, Partial Payment, Full Payment.

Payroll sonlari ochiq ko‘rinishi kerak: hisoblashlar yashirilmaydi va barcha adjustmentlar alohida aks etadi.
