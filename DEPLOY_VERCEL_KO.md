# Vercel 배포 방법

## 1. GitHub 저장소

새 저장소 예시:

`healingmart-tools-analytics`

ZIP을 풀고 안쪽 파일 전체를 저장소 루트에 올립니다. 루트에서 다음이 보여야 합니다.

- `api`
- `lib`
- `public`
- `package.json`
- `vercel.json`

## 2. Vercel Import

Vercel에서 Add New → Project → GitHub 저장소 Import를 선택합니다.

- Framework Preset: Other
- Root Directory: 비워 둠
- Build Command: 비워 둠
- Output Directory: 비워 둠

## 3. Redis 연결

Vercel 프로젝트의 Storage 또는 Marketplace에서 Upstash Redis를 연결합니다. 연결 후 다음 중 한 쌍이 주입되면 코드가 자동 인식합니다.

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`

## 4. 직접 추가할 환경변수

Project Settings → Environment Variables:

- `ANALYTICS_HASH_SALT`: 32자 이상의 임의 문자열
- `ADMIN_TOKEN`: 관리자 통계 확인용 긴 임의 문자열
- `ALLOWED_ORIGINS`: `https://www.healing-mart.com,https://healing-mart.com,https://실제프로젝트주소.vercel.app`

Production, Preview, Development에 필요한 범위로 설정하고 Redeploy합니다.

## 5. 확인 주소

- `https://프로젝트주소.vercel.app/api/health`
- `https://프로젝트주소.vercel.app/test.html`
- `https://프로젝트주소.vercel.app/api/rankings?limit=12`

정상 상태:

```json
{
  "ok": true,
  "redis": "connected",
  "security": "configured"
}
```

## 6. Blogger 연결 주소

Blogger 파일에는 기본값으로 다음 주소가 들어 있습니다.

`https://healingmart-tools-analytics.vercel.app`

실제 Vercel 주소가 다르면 Blogger 파일에서 `analyticsBaseUrl` 한 줄만 바꿉니다.
