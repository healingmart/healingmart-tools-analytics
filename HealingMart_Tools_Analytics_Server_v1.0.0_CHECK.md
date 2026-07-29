# HealingMart Tools Analytics v1.0.0 검증 보고서

검증일: 2026-07-30

## 기능

- `POST /api/event`: 도구 실행·검색 결과 선택 집계
- `GET /api/rankings`: 최근 30일 가중 인기·검색 선택 순위
- `GET /api/health`: Redis와 보안 설정 점검
- `GET /api/admin/stats`: 관리자 누적 통계
- `/test.html`: 배포 후 브라우저 시험
- `/client/hm-tools-analytics-client.v1.js`: 계산기·컨버터 직접 방문 추적용 공통 클라이언트

## 개인정보 최소화

저장하지 않음:

- 계산기 입력값과 결과
- 검색어 원문
- 업로드 파일과 파일명
- 이름·이메일·전화번호
- 원본 IP 주소

처리 방식:

- IP는 서버에서 salt 기반 SHA-256 해시 후 호출 제한에만 사용
- 호출 제한 키 TTL 약 75초
- 일별 실행·검색 선택·도구 메타데이터 TTL 최대 45일
- 순위 캐시 TTL 10분

## 검사 결과

- Node 자동 테스트: 10/10 통과
- API 통합 테스트: 4/4 통과
- 시간·검증 단위 테스트: 6/6 통과
- 전체 JavaScript 문법 검사: 통과
- 허용되지 않은 Origin 차단 검사: 통과
- Redis pipeline 명령 구성 검사: 통과

## 실제 배포 확인 필요

Upstash Redis URL·Token은 패키지에 포함하지 않았습니다. Vercel에서 Redis를 연결하고 환경변수를 설정한 후 실제 저장·순위 응답을 확인해야 합니다.
