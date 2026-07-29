# 계산기·컨버터 직접 방문 통계 연결

웹도구 모음에서 클릭한 기록은 Blogger v10이 자동 전송합니다. Google 검색, 즐겨찾기 또는 외부 링크로 계산기·컨버터에 직접 들어온 사용까지 집계하려면 각 앱에 이 클라이언트를 한 번 연결합니다.

```html
<script defer src="https://healingmart-tools-analytics.vercel.app/client/hm-tools-analytics-client.v1.js"></script>
```

현재 도구가 확정된 직후 다음 중 하나를 호출합니다.

```javascript
window.HM_TOOLS_ANALYTICS.trackOpen({
  toolId: "calculator:" + calculatorId,
  toolType: "calculator",
  category: purposeCategory
});
```

```javascript
window.HM_TOOLS_ANALYTICS.trackOpen({
  toolId: "converter:" + converterId,
  toolType: "converter",
  category: purposeCategory
});
```

수집되는 값은 도구 ID, 형식, 목적 카테고리와 실행 동작뿐입니다. 계산 입력값, 결과, 검색어, 파일명은 보내지 않습니다.

같은 페이지에서 중복 초기화되는 경우 1.5초 이내 동일 이벤트는 클라이언트가 한 번만 전송합니다.
