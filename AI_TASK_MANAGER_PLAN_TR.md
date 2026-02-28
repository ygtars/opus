# AI Destekli Task Manager (Clockify benzeri Focus UI) — Ürün ve Teknik Plan

## 1) Ürün Vizyonu
Amaç: İş alındığında kullanıcı sadece hedefleri/özellikleri yazar, sistem bunu otomatik olarak:
- **Fazlara ayırır** (MVP, geliştirme, stabilizasyon),
- **Görevlere böler** (backend, frontend, test, dokümantasyon),
- **Takvime yerleştirir** (günlük/haftalık plan),
- Ekip 1 kişiyse tek kişiye, birden fazla kişiyse **yetkinlik bazlı dağıtır**,
- Süreç boyunca AI ile sürekli güncelleme yapar (risk, gecikme, yeniden planlama).

## 2) Hedef Kullanıcılar
- Freelance çalışanlar (tek kişi planlama)
- Küçük yazılım ekipleri (2–10 kişi)
- Ürün ekipleri (PM + developer + designer)

## 3) Ana Özellikler

### 3.1 Akıllı İş Kırılımı (AI Work Breakdown)
Kullanıcı prompt örneği:
> “Müşteri paneli + admin paneli + ödeme entegrasyonu istiyorum.”

Sistem çıktısı:
- Epic → Feature → Task hiyerarşisi
- Her task için:
  - açıklama
  - kabul kriteri (acceptance criteria)
  - tahmini süre (optimistic / realistic / pessimistic)
  - bağımlılıklar
  - önerilen rol (backend, frontend, QA)

### 3.2 Fazlama ve Yol Haritası
- Faz 1: Core mimari + temel CRUD
- Faz 2: İş akışı + entegrasyonlar
- Faz 3: Test, performans, hardening

AI, “önce ne yapılmalı?” sırasını dependency graph ile çıkarır.

### 3.3 Otomatik Atama (Skill-based Assignment)
- Her ekip üyesi için yetkinlik matrisi:
  - teknoloji (Node, React, SQL)
  - seviye (junior/mid/senior)
  - kapasite (saat/gün)
- AI atama motoru:
  - skill match
  - kapasite uygunluğu
  - kritik görev önceliği

### 3.4 Otomatik Takvim Planı
Örnek günlük plan çıktısı:
- Gün 1: Backend setup + auth CRUD
- Gün 2: User CRUD + testler
- Gün 3: Frontend auth ekranları

Plan üretimi:
- sprint uzunluğu
- tatil/izin günleri
- paralel çalışma imkanı
- tahmini gecikme tamponu

### 3.5 Full Focus UI (Clockify benzeri)
- Sol panel: Proje/Faz/Task listesi
- Orta alan: Aktif görev + checklist + AI önerileri
- Sağ panel: Zamanlayıcı, kapasite, günlük plan
- Modlar:
  - Focus mode (tek görev)
  - Plan mode (takvim ve dağılım)
  - Team mode (kişilere göre görünüm)

### 3.6 AI Proje Asistanı
Komut örnekleri:
- “Bu işi 10 güne sığdır.”
- “Backend işi Ahmet’e, frontend’i Ayşe’ye dağıt.”
- “Riskli görevleri göster.”
- “Bugün gecikmeye göre planı güncelle.”

## 4) Sistem Mimarisi (Öneri)

### 4.1 Frontend
- Next.js + TypeScript
- UI: Tailwind + component library
- Durum: Zustand/Redux Toolkit
- Gerçek zamanlı güncelleme: WebSocket

### 4.2 Backend
- NestJS (veya FastAPI)
- PostgreSQL
- Redis (queue/cache)
- Job scheduler (BullMQ/Temporal)

### 4.3 AI Katmanı
- LLM orchestrator servisi
- Fonksiyonlar:
  1. requirement parser
  2. task decomposition
  3. estimation engine
  4. assignment planner
  5. re-planning engine

Öneri: AI kararlarını JSON schema ile zorunlu formatta döndürmek.

### 4.4 Veri Modeli (Özet)
- Organization
- Project
- Phase
- Task
- Dependency
- Member
- SkillProfile
- Assignment
- CalendarBlock
- TimeLog
- AIPlanVersion

## 5) Planlama Motoru (Algoritma)

1. Requirement metnini parse et
2. Feature ve task graph oluştur
3. Task’lara effort puanı ata
4. Skill eşleşmesi skorla
5. Constraint-based scheduler ile takvime yerleştir
6. Gecikme olduğunda yeniden optimize et

Kullanılabilecek teknikler:
- Rule-based + LLM hybrid
- Topological sort (dependency ordering)
- Weighted bipartite matching (task-member assignment)
- Basit MILP/heuristic scheduling

## 6) MVP Yol Haritası (12 Hafta)

### Faz 0 (Hafta 1)
- Ürün kapsamı
- Veri modeli
- Prompt/çıktı şemaları

### Faz 1 (Hafta 2–4)
- Proje oluşturma
- AI ile task breakdown
- Manuel atama + takvim görünümü

### Faz 2 (Hafta 5–8)
- Skill profilleri
- Otomatik atama
- Günlük plan üretimi

### Faz 3 (Hafta 9–10)
- Re-planning (gecikme/izin)
- Risk uyarıları

### Faz 4 (Hafta 11–12)
- Focus UI polish
- Ölçümleme + raporlama
- Pilot kullanıcı testleri

## 7) Başarı Metrikleri
- Plan hazırlama süresi: manuelden %60 daha hızlı
- Sprint tahmin doğruluğu: ±%20 bandında
- Task gecikme oranı: %25 azalma
- Kullanıcı başına günlük aktif kullanım süresi

## 8) Riskler ve Önlemler
- **AI halüsinasyonu** → schema validation + kurallı kontrol
- **Yanlış süre tahmini** → historical data feedback loop
- **Ekip kapasite çakışması** → zorunlu kapasite kısıtı
- **Karmaşık UI** → role-based sade görünüm

## 9) Örnek Kullanım Akışı
1. Kullanıcı: “E-ticaret admin paneli istiyorum.”
2. AI: Fazlara böl, görevleri çıkar, tahminle.
3. Kullanıcı ekip üyelerini ve skill’leri girer.
4. Sistem otomatik atama + takvim üretir.
5. Günlük standup sonrası AI planı revize eder.

## 10) Bir Sonraki Adım (Uygulanabilir)
Hemen başlanacak backlog:
1. `projects`, `tasks`, `members`, `skills` tabloları
2. Prompt-to-JSON task decomposition endpoint
3. Basit atama skorlama fonksiyonu
4. Haftalık takvim görünümü
5. Focus mode timer + task progress

Bu 5 adım tamamlandığında çalışır bir MVP demosu çıkmış olur.
