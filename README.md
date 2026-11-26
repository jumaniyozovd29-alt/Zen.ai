# ZENAI

O‘zbek tilidagi AI platforma: AI Chat, Image AI, Video AI va 3D Video AI.

## Hozirgi holat

- Frontend landing page: index.html
- Auth sahifasi: auth.html (Supabase email/password)
- Authenticated chat sahifasi: app.html
- Backend health/config endpointlari: mavjud
- AI provayderi: kod orqali tayyor, lekin real API kaliti ulanmagan
- Supabase schema va limit funksiyalari: mavjud, lekin Supabase project’da ishga tushirilishi kerak
- To‘lov tizimi: ulanmagan
- Hosting va domen: ulanmagan

## Lokal ishga tushirish

1. Node.js 18+ o‘rnating.
2. npm install
3. .env.example faylidan .env yarating.
4. Supabase SQL Editor’da supabase/schema.sql ni ishga tushiring.
5. npm start
6. GET /health orqali tekshiring.

Frontend uchun auth.html va app.html ichidagi ZENAI_SUPABASE_URL, ZENAI_SUPABASE_ANON_KEY qiymatlarini kiritish kerak. Backend API manzili uchun ZENAI_API_BASE o‘zgaruvchisini moslang.

API kalitlarini GitHub’ga yozmang. Ularni faqat hosting/server environment variables ichida saqlang.

## Tariflar

- FREE: oyiga 250 ta xabar
- PREMIUM: oyiga 29 000 so‘m, oyiga 1 500 ta xabar

Bu repo prototip va backend skeletini saqlaydi. Supabase, AI provider va hosting real sozlanmaguncha platforma ommaviy ishlab turgan deb hisoblanmaydi.

## API xavfsizlik himoyasi

- CORS: ALLOWED_ORIGIN orqali domenlar ro‘yxati bilan cheklanadi.
- Rate limit: API uchun bir IP/token bo‘yicha daqiqasiga 30 ta so‘rov (RATE_LIMIT_PER_MINUTE bilan o‘zgartiriladi).
- Chat xabari maksimal 8000 belgi.
- Production rejimida ichki xato tafsilotlari qaytarilmaydi.

## Frontend konfiguratsiyasi

config.example.js faylidan nusxa olib config.js yarating va Supabase URL, anon key hamda backend API manzilini kiriting. service_role kalitini browser fayliga hech qachon qo‘ymang. Hozirgi auth.html va app.html ichidagi konfiguratsiya o‘zgaruvchilarini shu qiymatlar bilan moslang.
