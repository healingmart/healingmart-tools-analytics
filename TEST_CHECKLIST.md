# 운영 전 체크리스트

- [ ] `/api/health` HTTP 200
- [ ] `redis` 값이 `connected`
- [ ] `security` 값이 `configured`
- [ ] `/test.html` 실행 이벤트 HTTP 202
- [ ] 검색 선택 이벤트 HTTP 202
- [ ] `/api/rankings?limit=12` HTTP 200
- [ ] 응답에 `popular`, `searched` 배열 존재
- [ ] 허용되지 않은 외부 Origin HTTP 403
- [ ] 이벤트 본문에 검색어·계산값·파일명을 보내지 않음
- [ ] Blogger에서 도구 클릭 후 개인 자주 사용 목록 변경
- [ ] 실제 통계가 부족할 때 기본 추천 목록 표시
- [ ] 검색 결과 클릭 후 `searched` 순위에 해당 도구가 반영됨
- [ ] 45일이 지난 일별 집계 키가 자동 만료됨
