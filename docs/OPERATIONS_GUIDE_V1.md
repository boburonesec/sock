# Paypoq OS — Operations Guide v1

Status: Active

Date: 2026-06-30

## Maqsad

Bu qo‘llanma Paypoq OS’ni ishlatadigan owner, manager, accountant, seller,
warehouse operator va shift receiver uchun oddiy operational tushuntirish
beradi.

## 1. Owner login

Local/pilot demo account:

```text
LOCAL DEVELOPMENT ONLY
Email: owner@paypoq.local
Password: ChangeMe123!
```

Kirish:

```text
/login
```

Owner ko‘ra oladi:

- Executive dashboard
- production
- warehouse
- sales
- finance
- employees
- reports
- settings

## 2. Product yaratish

Routes:

```text
/settings/colors
/settings/materials
/settings/seasons
/settings/products
```

Jarayon:

1. Rang yarating yoki mavjudini tanlang.
2. Material yarating yoki mavjudini tanlang.
3. Mavsum yarating yoki mavjudini tanlang.
4. Product model yarating.
5. Product variant yarating:
   - model
   - rang
   - material
   - mavsum
6. Variant price qo‘shing.

Muhim:

- Size MVP’da yo‘q.
- Sales order narxi backend’da frozen snapshot sifatida saqlanadi.

## 3. Employee yaratish

Route:

```text
/employees
```

Jarayon:

1. `Xodim qo‘shish`.
2. Ism kiriting.
3. Saqlang.

Qoidalar:

- Employee hard-delete qilinmaydi.
- Kerak bo‘lsa inactive qilinadi.
- Employee web app ishlatmaydi.
- Shift Receiver worker activity kiritadi.

## 4. Salary rate sozlash

Route:

```text
/settings/salary-rates
```

Jarayon:

1. Stage tanlang.
2. Optional product variant tanlang.
3. Amount kiriting.
4. Effective date kiriting.

V1 qo‘llaydi:

- factory + stage rate
- factory + stage + product variant rate

Qo‘llamaydi:

- employee-specific rate

Muhim:

- WorkerActivity salaryRateAmount snapshot saqlaydi.
- Payroll keyin shu snapshotdan hisoblanadi.

## 5. Production flow

Route:

```text
/production
```

Asosiy zanjir:

```text
Partiya yaratish
→ Bosqichga o‘tkazish
→ Ishchi faolligi
→ Brak qayd qilish
→ Ombor stage
→ Omborga qabul qilish
```

### Partiya yaratish

Product variant va quantity tanlanadi.

Natija:

- ProductionBatch yaratiladi.
- Birinchi stage inventory oshadi.
- StageMovement history yaratiladi.

### Bosqichga o‘tkazish

Source stage, destination stage, product variant, quantity tanlanadi.

Natija:

- source StageInventory kamayadi
- destination StageInventory oshadi
- movement history yoziladi

### Ishchi faolligi

Employee, stage, product variant, quantity kiritiladi.

Natija:

- WorkerActivity yaratiladi.
- StageInventory o‘zgarmaydi.
- Payroll keyinchalik shu activity’dan hisoblaydi.

### Brak

Brak quantity va reason kiritiladi.

Natija:

- Defect record yaratiladi.
- Penalty avtomatik yaratilmaydi.
- Payroll avtomatik o‘zgarmaydi.

## 6. Warehouse

Routes:

```text
/warehouse
/warehouse/materials
/warehouse/movements
/warehouse/zones
```

### Finished product receipt

Production `Ombor` stage’dan warehouse stock’ga qabul qilinadi.

Natija:

- Ombor StageInventory kamayadi.
- Finished Products stock oshadi.
- StockMovement yaratiladi.

### Material receipt

Route:

```text
/warehouse/materials
```

Material, quantity, unit va zone tanlanadi.

Natija:

- MaterialStock oshadi.
- StockMovement yaratiladi.

### Stock correction

Stock noto‘g‘ri bo‘lsa, correction reason bilan qilinadi.

Natija:

- stock snapshot yangi quantity’ga set qilinadi.
- StockMovement `CORRECTION` yaratiladi.
- eski movementlar edit qilinmaydi.

## 7. Sales

Routes:

```text
/sales/clients
/sales/orders
/sales/payments
/sales/debts
```

### Client yaratish

Client nomi, telefon, manzil, notes kiritiladi.

Client qarzi frontend’da hisoblanmaydi.

### Order yaratish

Client va product variant rows tanlanadi.

Backend:

- unit price resolve qiladi yoki formdan kelgan narxni tekshiradi
- totalPrice hisoblaydi
- order totalAmount saqlaydi

### Payment allocation

Payment to‘liq allocation bilan kiritiladi.

V1:

- unallocated payment yo‘q
- client credit yo‘q
- overpayment yo‘q

### Delivery

Order faqat to‘liq paid bo‘lsa delivery qilinadi.

Natija:

- Finished Products stock kamayadi.
- StockMovement `OUT` yaratiladi.
- order status `DELIVERED` bo‘ladi.

### Delivery return

Faqat `DELIVERED` order return qilinadi.

Natija:

- stock Finished Products’ga qaytadi.
- StockMovement `RETURN` yaratiladi.
- order status `READY` bo‘ladi.
- paymentStatus o‘zgarmaydi.

### Payment reversal

Payment reversal alohida explicit action.

Qoidalar:

- Delivered/Closed order payment reversal bloklanadi.
- Delivery return qilingandan keyin reversal mumkin.
- Debt projection reversal’dan keyin oshadi.

## 8. Supplier finance

Route:

```text
/finance/suppliers
```

Jarayon:

1. Supplier yarating.
2. Supplier purchase yarating.
3. Supplier payment allocation qiling.
4. Supplier debt projection ko‘ring.

Muhim:

- Supplier purchase avtomatik material stock yaratmaydi.
- Material receipt alohida warehouse flow.
- Supplier debt backend’da hisoblanadi.

## 9. Payroll

Route:

```text
/finance/payroll
```

Flow:

```text
Period create
→ Calculate
→ Review
→ Pay
→ Close
```

Qoidalar:

- WorkerActivity source-of-truth.
- salaryRateAmount snapshot authoritative.
- Bonuses increase pay.
- Penalties reduce pay.
- Advances reduce pay.
- Closed payroll immutable.
- Frontend payroll hisoblamaydi.

## 10. Dashboards

Routes:

```text
/dashboard/executive
/dashboard/operations
/sales
/finance
/warehouse
/tv
```

Dashboardlar backend summary endpointlardan keladi.

Frontend:

- KPI hisoblamaydi
- debt hisoblamaydi
- stock total hisoblamaydi
- payroll hisoblamaydi

## 11. Correction flows mavjud

Mavjud:

- Warehouse stock correction
- Sales payment reversal
- Delivery return

Mavjud emas:

- supplier payment reversal
- production movement correction
- material receipt correction
- payroll correction after close
- partial delivery return

## 12. Nima hali qo‘llanmaydi

Hali yo‘q:

- full accounting ledger
- invoice/print flow
- IoT integration
- mobile app
- Telegram bot
- super-admin SaaS owner panel
- audit browsing UI
- bulk import/export
- stock reservation
- multi-warehouse optimized UI

## 13. Operator uchun muhim eslatmalar

- Eski movement/payment/audit recordlarni o‘chirmang.
- Xatoni correction/reversal flow orqali tuzating.
- Payroll yopilgandan keyin immutable.
- Employee delete qilinmaydi, inactive qilinadi.
- Qarzdorlik backend projection sifatida keladi.

## 14. Demo uchun tavsiya

Demo script:

- `docs/MVP_DEMO_SCRIPT_V2.md`

Pilot runbook:

- `docs/MVP_PILOT_RUNBOOK_V1.md`
