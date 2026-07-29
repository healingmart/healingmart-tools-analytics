# HealingMart Tools Analytics v1.0.0

힐링편의점 웹도구 페이지의 다음 항목을 자동화하는 소형 Vercel API입니다.

- 전체 방문자가 최근 많이 실행한 도구
- 검색 결과에서 많이 선택한 도구
- 도구별 익명 실행 통계
- 계산기·컨버터 직접 방문 통계용 공통 클라이언트

수집하지 않는 정보:

- 계산기 입력값과 결과
- 검색어 원문
- 업로드 파일과 파일명
- 이름, 이메일, 전화번호
- 원본 IP 주소

서버는 도구 ID, 도구 형식, 목적 카테고리, 동작 종류만 저장합니다. IP는 1분 단위 호출 제한을 위해 서버에서 일방향 해시한 뒤 약 75초 동안만 사용합니다.

## 먼저 할 일

1. 이 폴더 전체를 새 GitHub 저장소 루트에 업로드합니다.
2. Vercel에서 저장소를 Import합니다.
3. 프로젝트 이름을 가능하면 `healingmart-tools-analytics`로 지정합니다.
4. Vercel Marketplace에서 Upstash Redis를 연결합니다.
5. Windows에서 `GENERATE_SECRETS.bat`를 실행합니다.
6. 생성된 `ANALYTICS_HASH_SALT`, `ADMIN_TOKEN`을 Vercel 환경변수로 추가합니다.
7. 다시 배포합니다.
8. `/api/health`에서 `redis: connected`, `security: configured`를 확인합니다.
9. `/test.html`에서 이벤트와 순위를 시험합니다.
10. 함께 제공한 Blogger v10 파일을 게시물 HTML 전체와 교체합니다.

상세 과정은 `DEPLOY_VERCEL_KO.md`를 확인하세요.

## 주요 주소

- `/api/health`: Redis와 보안 설정 상태
- `/api/event`: 익명 실행 이벤트 저장
- `/api/rankings?limit=12`: 인기·검색 선택 순위
- `/api/admin/stats`: 관리자 토큰이 필요한 누적 통계
- `/test.html`: 브라우저 연결 시험
- `/client/hm-tools-analytics-client.v1.js`: 계산기·컨버터 직접 방문 추적 클라이언트

## 로컬 검증

```bash
npm test
npm run check
```

현재 패키지는 API·검증·시간 계산·CORS 통합 테스트 **10개**와 전체 JavaScript 문법 검사를 포함합니다.
