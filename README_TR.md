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
- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/members`
- `GET /api/members`
- `POST /api/skills`
- `POST /api/members/:memberId/skills`
- `POST /api/projects/:projectId/ai-plan`
- `GET /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/tasks/:taskId/dependencies`
- `GET /api/tasks/:taskId/dependencies`

## 3) Step-by-step Akış (Gerçek kullanım)

### Step 1 — Proje aç
```bash
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"E-Ticaret Admin","description":"AI plan denemesi"}'
```

### Step 2 — Ekip üyelerini ekle
```bash
curl -X POST http://localhost:3000/api/members \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ahmet","role":"backend","capacityHoursPerDay":7}'
```

```bash
curl -X POST http://localhost:3000/api/members \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ayşe","role":"frontend","capacityHoursPerDay":6}'
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

### Step 4 — Requirement ver ve AI plan oluştur
```bash
curl -X POST http://localhost:3000/api/projects/1/ai-plan \
  -H 'Content-Type: application/json' \
  -d '{"requirement":"backend auth api, kullanıcı crud, frontend dashboard, test", "clearExisting": true, "startDay": 1}'
```

### Step 5 — Oluşan görevleri takvim sırasıyla çek
```bash
curl http://localhost:3000/api/projects/1/tasks
```

### Step 6 — Task güncelle ve dependency tanımla
```bash
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","estimateHours":6}'
```

```bash
curl -X POST http://localhost:3000/api/tasks/2/dependencies \
  -H 'Content-Type: application/json' \
  -d '{"blockedByTaskId":1}'
```

## 4) Planlama Mantığı (Kapasite bazlı)
- Requirement metni küçük parçalara ayrılır.
- Her parça için gerekli skill tahmini çıkarılır (`nodejs`, `react`, `sql`, `qa`).
- Skill eşleşen üyeye görev atanır, eşleşme yoksa en az toplam yükteki kişiye atanır.
- Her üyenin `capacity_hours_per_day` bilgisi dikkate alınır ve `day_index` bu kapasiteye göre hesaplanır.

Örnek: kapasite 8 saat/gün olan kişide 5 saatlik ilk görev ve 4 saatlik ikinci görev aynı güne düşebilir; biriken yük arttıkça sonraki görevler bir sonraki güne taşınır.

## 5) Sonraki iterasyon (hemen eklenebilir)
1. JWT auth + organization yapısı
2. Task dependency için cycle kontrolü
3. Sprint kapasite limiti ve gerçek takvim (hafta sonu hariç)
4. LLM entegrasyonu (JSON schema zorunlu çıktı)
5. Frontend focus UI (timer + günlük plan)

## 6) Test
```bash
npm test
```
