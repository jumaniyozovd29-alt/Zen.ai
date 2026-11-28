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
- Backend statik frontend fayllarini ham serve qiladi; hosting va domen: ulanmagan

## Lokal ishga tushirish

1. Node.js 18+ o‘rnating.
2. npm install
3. .env.example faylidan .env yarating.
4. Supabase SQL Editor’da supabase/schema.sql ni ishga tushiring.
5. npm start
6. GET /health orqali tekshiring.

Frontend uchun `config.example.js` nusxasidan `config.js` yarating va `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE` qiymatlarini kiriting. `auth.html` va `app.html` shu umumiy konfiguratsiyadan foydalanadi. Backend bir domen ichida serve qilinsa, `API_BASE` ni shu domen manziliga moslang.

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


## Production deploy (Railway yoki Docker)

Repozitoriyada Dockerfile, .dockerignore va railway.toml mavjud. Railway’da GitHub repositoriyasini ulang; build avtomatik Dockerfile orqali ishlaydi. Service Variables bo‘limiga quyidagilarni kiriting:

- PORT=3000
- NODE_ENV=production
- ALLOWED_ORIGIN=https://zenai.uz
- RATE_LIMIT_PER_MINUTE=30
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AI_PROVIDER
- AI_BASE_URL
- AI_MODEL
- AI_API_KEY

Railway deploy’dan keyin avval `/health` endpointini tekshiring. `supabaseConfigured:true` va `aiConfigured:true` chiqmasa, tashqi sozlama tugallanmagan bo‘ladi. Domen hali ulanmagan bo‘lsa, vaqtincha Railway URL’ini `ALLOWED_ORIGIN` ga qo‘ying.

Deploy’dan keyin asosiy tekshiruvlar: `/health`, `/`, `/auth.html`, `/app.html`. Backend endi `index.html`, `auth.html`, `app.html` fayllarini statik serve qiladi.

Docker bilan lokal tekshiruv:
```bash
docker build -t zenai-api .
docker run --env-file .env -p 3000:3000 zenai-api
curl http://localhost:3000/health
```
