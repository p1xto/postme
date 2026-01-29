# PostMe 💬

익명 메시지를 주고받는 iMessage 스타일 방명록

## 기능

- 🎭 **익명 메시지** - 회색 말풍선으로 표시
- 💙 **관리자 답글** - 파란색 말풍선으로 표시
- 👆 **스와이프 답장** - 메시지를 오른쪽으로 스와이프하여 답장
- 📱 **PWA 지원** - 홈 화면에 앱처럼 설치 가능
- ⚡ **실시간 업데이트** - 새 메시지 자동 반영

---

## 배포 가이드

### 1. Supabase 설정

1. [supabase.com](https://supabase.com) → 프로젝트 생성
2. **SQL Editor** → `supabase-schema.sql` 내용 붙여넣기 → Run
3. **Settings** → **API** 에서 복사:
   - `Project URL`
   - `anon public` 키

### 2. Vercel 배포

1. 이 저장소를 GitHub에 업로드
2. [vercel.com](https://vercel.com) → Import
3. Environment Variables 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxxx...
   ```
4. Deploy

---

## 프로젝트 구조

```
├── app/
│   ├── globals.css
│   ├── layout.js
│   ├── page.js          # 홈 (가입/방문)
│   └── [username]/
│       └── page.js      # 채팅 페이지
├── lib/
│   └── supabase.js
├── public/
│   └── manifest.json
└── supabase-schema.sql
```

---

## 라이선스

MIT
