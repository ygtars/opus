# Node.js + SQLite ile AI Task Manager MVP (Adım Adım)

Bu doküman, önceki ürün planını **çalışan bir backend MVP**'ye dönüştürmek için adım adım uygulanacak yolu anlatır.

## 1) Kurulum

```bash
npm install
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

## 2) MVP'de Hazır Endpoint'ler

- `GET /health`
- `POST /api/organizations`
- `GET /api/organizations`
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/members`
- `GET /api/members`
- `POST /api/skills`
- `POST /api/members/:memberId/skills`
- `POST /api/projects/:projectId/ai-plan/preview`
- `POST /api/projects/:projectId/ai-plan`
- `GET /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/tasks/:taskId/dependencies`
- `GET /api/tasks/:taskId/dependencies`

## 3) Iteration-1 Akış (temel)

### Step 1 — Organization + proje aç
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acme"}'
```

```bash
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":1,"name":"E-Ticaret Admin","description":"AI plan denemesi"}'
```

### Step 2 — Ekip üyelerini ekle
```bash
curl -X POST http://localhost:3000/api/members \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":1,"fullName":"Ahmet","role":"backend","capacityHoursPerDay":7}'
```

```bash
curl -X POST http://localhost:3000/api/members \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":1,"fullName":"Ayşe","role":"frontend","capacityHoursPerDay":6}'
```

### Step 3 — Skill tanımla
```bash
curl -X POST http://localhost:3000/api/members/1/skills \
  -H 'Content-Type: application/json' \
  -d '{"skillName":"nodejs","level":"senior"}'
```

```bash
curl -X POST http://localhost:3000/api/members/2/skills \
  -H 'Content-Type: application/json' \
  -d '{"skillName":"react","level":"mid"}'
```

### Step 4 — AI plan preview al (kaydetmeden)
```bash
curl -X POST http://localhost:3000/api/projects/1/ai-plan/preview \
  -H 'Content-Type: application/json' \
  -d '{"requirement":"backend auth api, kullanıcı crud, frontend dashboard, test", "startDay": 1, "startDate":"2026-03-06", "skipWeekends": true}'
```

### Step 5 — AI planı kaydet
```bash
curl -X POST http://localhost:3000/api/projects/1/ai-plan \
  -H 'Content-Type: application/json' \
  -d '{"requirement":"backend auth api, kullanıcı crud, frontend dashboard, test", "clearExisting": true, "startDay": 1, "startDate":"2026-03-06", "skipWeekends": true}'
```

### Step 6 — Oluşan görevleri takvim sırasıyla çek
```bash
curl http://localhost:3000/api/projects/1/tasks
```

## 4) Iteration-2 Akış (yeni)

### Step 7 — Task güncelle
```bash
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","estimateHours":6,"dayDate":"2026-03-06"}'
```

### Step 8 — Dependency tanımla (cycle kontrolü var)
```bash
curl -X POST http://localhost:3000/api/tasks/2/dependencies \
  -H 'Content-Type: application/json' \
  -d '{"blockedByTaskId":1}'
```

Eğer `1` zaten dolaylı olarak `2`'ye bağlıysa API hata döner:
```json
{ "error": "dependency would create a cycle" }
```

## 5) Planlama Mantığı (Kapasite + hafta sonu hariç)
- Requirement metni küçük parçalara ayrılır.
- Her parça için gerekli skill tahmini çıkarılır (`nodejs`, `react`, `sql`, `qa`).
- Skill eşleşen üyeye görev atanır, eşleşme yoksa en az toplam yükteki kişiye atanır.
- Her üyenin `capacity_hours_per_day` bilgisi dikkate alınır.
- `skipWeekends=true` ise `day_date` Cumartesi/Pazar'a düşmez.

## 6) Sonraki iterasyon (hemen eklenebilir)
1. Basit JWT auth (organization scoped)
2. Dependency için kritik yol (critical path) hesaplama
3. Story point / velocity bazlı tahmin düzeltme
4. LLM entegrasyonu (JSON schema zorunlu çıktı)
5. Frontend focus UI (timer + günlük plan)

## 7) Test
```bash
npm test
```
