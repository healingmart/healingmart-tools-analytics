(function(window,document){
  "use strict";
  var data=window.HM_WEBTOOLS_DATA;
  var tools=data.tools.filter(function(tool){return tool.available&&tool.url;});
  var CALCULATOR_PAGE_URL="https://www.healing-mart.com/2026/07/calculator.html";
  var CONVERTER_PAGE_URL="https://www.healing-mart.com/2026/07/converter.html";
  var CALCULATOR_LOADER_URL="https://healingmart.github.io/healingmart-calculator/dist/js/hm-calculator-catalog-loader.v1.js";
  var CONVERTER_CLIENT_URL="https://healingmart.github.io/healingmart-converter/dist/js/hm-converter-search-client.v1.js";
  var CALCULATOR_MANIFEST_URL="https://healingmart.github.io/healingmart-calculator/dist/catalog/hm-calculators-manifest.v1.js";
  var CONVERTER_MANIFEST_URL="https://healingmart.github.io/healingmart-converter/dist/catalog/hm-converter-public-manifest.v1.js";
  var ANALYTICS_BASE_URL=String(data.settings.analyticsBaseUrl||"").replace(/\/$/,"");
  var SEARCH_RESULT_LIMIT=Math.max(12,Number(data.settings.searchResultLimit)||60);
  var calculatorTools=[];
  var converterTools=[];
  var toolLookup={};
  var globalRankings={popular:[],searched:[]};
  var rankingsPromise=null;
  var rankingsReady=false;
  var rankingsError=null;
  var unifiedCatalogPromise=null;
  var unifiedCatalogReady=false;
  var unifiedCatalogError=null;
  var scriptPromises={};
  var searchRequestId=0;
  var searchInputTimer=0;
  var categories=data.categories.slice().sort(function(a,b){return (a.order||0)-(b.order||0);});
  var categoryMap={};
  categories.forEach(function(category){categoryMap[category.id]=category;});
  var hero=document.querySelector("[data-hm-tools-hero]");
  var form=document.querySelector("[data-hm-tools-search-form]");
  var input=document.querySelector("[data-hm-tools-search]");
  var clearButton=document.querySelector("[data-hm-tools-clear]");
  var resultsGrid=document.querySelector("[data-hm-tools-results-grid]");
  var resultsMeta=document.querySelector("[data-hm-tools-results-meta]");
  var popularTrack=document.querySelector("[data-hm-tools-popular-track]");
  var popularViewport=popularTrack?popularTrack.parentElement:null;
  var categoryBar=document.querySelector("[data-hm-tools-categories]");
  var allGrid=document.querySelector("[data-hm-tools-all-grid]");
  var updateTrack=document.querySelector("[data-hm-tools-update-track]");
  var personalGrid=document.querySelector("[data-hm-tools-personal-grid]");
  var personalTitle=document.querySelector("[data-hm-tools-personal-title]");
  var personalDesc=document.querySelector("[data-hm-tools-personal-desc]");
  var popularStatus=document.querySelector("[data-hm-tools-popular-status]");
  var searchedGrid=document.querySelector("[data-hm-tools-searched-grid]");
  var searchedStatus=document.querySelector("[data-hm-tools-searched-status]");
  var latestGrid=document.querySelector("[data-hm-tools-latest-grid]");
  var latestStatus=document.querySelector("[data-hm-tools-latest-status]");
  var toast=document.querySelector("[data-hm-tools-toast]");
  var shareOverlay=document.querySelector("[data-hm-tools-share-overlay]");
  var sheetOverlay=document.querySelector("[data-hm-tools-sheet-overlay]");
  var sheetTitle=document.querySelector("[data-hm-tools-sheet-title]");
  var sheetSubtitle=document.querySelector("[data-hm-tools-sheet-subtitle]");
  var sheetList=document.querySelector("[data-hm-tools-sheet-list]");
  var bottomNav=document.querySelector(".hm-tools-bottom-nav");
  var currentCategory="all";
  var popularIndex=0;
  var popularTimer=0;
  var updateIndex=0;
  var updateTimer=0;

  function element(tag,className,text){
    var node=document.createElement(tag);
    if(className)node.className=className;
    if(typeof text==="string")node.textContent=text;
    return node;
  }
  function svgIcon(name){
    var ns="http://www.w3.org/2000/svg";
    var svg=document.createElementNS(ns,"svg");
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    var paths={
      calculator:["rect|4|3|16|18|2","path|M8 7h8","path|M8 11h2M14 11h2M8 15h2M14 15h2"],
      convert:["path|M7 7h11l-3-3","path|M17 17H6l3 3","path|M18 7v4","path|M6 17v-4"],
      image:["rect|3|4|18|16|2","circle|8.5|9|1.5","path|M21 15l-5-5L5 20"],
      watermark:["rect|3|4|18|16|2","path|M7 9l2 6 3-5 3 5 2-6"],
      writing:["path|M4 19.5V15L14.5 4.5l4 4L8 19H4z","path|M12.5 6.5l4 4"],
      cutout:["path|M4 8h16M8 4v16","rect|8|8|10|10|2"],
      crop:["path|M6 2v16a2 2 0 0 0 2 2h14","path|M2 6h16a2 2 0 0 1 2 2v14"],
      pin:["path|M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z","circle|12|10|2"],
      document:["path|M6 2h8l4 4v16H6z","path|M14 2v5h5","path|M9 12h6M9 16h6"],
      life:["path|M3 11.5 12 4l9 7.5","path|M5.5 10.5V20h13v-9.5","path|M9.5 20v-6h5v6"],
      video:["rect|3|5|18|14|2","path|M10 9l5 3-5 3z"],
      audio:["path|M9 18V5l10-2v13","circle|6|18|3","circle|16|16|3"],
      developer:["path|M8 9 4 12l4 3","path|M16 9l4 3-4 3","path|M14 5l-4 14"],
      all:["rect|4|4|6|6|1","rect|14|4|6|6|1","rect|4|14|6|6|1","rect|14|14|6|6|1"],
      search:["circle|11|11|7","path|M16.5 16.5 20.5 20.5"],
      arrow:["path|M5 12h14","path|M13 6l6 6-6 6"]
    };
    var defs=paths[name]||paths.document;
    defs.forEach(function(def){
      var parts=def.split("|");
      var node;
      if(parts[0]==="path"){node=document.createElementNS(ns,"path");node.setAttribute("d",parts[1]);}
      else if(parts[0]==="rect"){node=document.createElementNS(ns,"rect");node.setAttribute("x",parts[1]);node.setAttribute("y",parts[2]);node.setAttribute("width",parts[3]);node.setAttribute("height",parts[4]);if(parts[5])node.setAttribute("rx",parts[5]);}
      else{node=document.createElementNS(ns,"circle");node.setAttribute("cx",parts[1]);node.setAttribute("cy",parts[2]);node.setAttribute("r",parts[3]);}
      svg.appendChild(node);
    });
    return svg;
  }
  function popularSvgIcon(name){
    var ns="http://www.w3.org/2000/svg";
    var svg=document.createElementNS(ns,"svg");
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    svg.setAttribute("class","hm-tools-popular-glyph");
    var paths={
      calculator:["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm0 2v4h10V4H7Zm0 6v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2ZM7 14v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v6h2v-6h-2ZM7 18v2h2v-2H7Zm4 0v2h2v-2h-2Z"],
      convert:["M7.5 21.5 4 18l3.5-3.5 1.41 1.41L7.83 17H16v-4h2v6H7.83l1.08 1.09-1.41 1.41Zm9-19L20 6l-3.5 3.5-1.41-1.41L16.17 7H8v4H6V5h10.17l-1.08-1.09L16.5 2.5Z"],
      watermark:["M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1.25 5 2.08 8h2.1L12 11.32 13.57 16h2.1l2.08-8h-2.02l-1.25 5.18L13 8h-2l-1.48 5.18L8.27 8H6.25Z"],
      writing:["M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.21a1.004 1.004 0 0 0 0-1.42l-2.34-2.34a1.004 1.004 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82Z"],
      cutout:["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm2 2h4v4H6V8Zm4 4h4v4h-4v-4Zm4-4h4v4h-4V8Zm2.5 7.25 1.25 1.25 2.75-3-1.25-1.25-2.75 3Z"],
      crop:["M17 15h2V7a2 2 0 0 0-2-2H9v2h8v8ZM7 17V1H5v4H1v2h4v10a2 2 0 0 0 2 2h10v4h2v-4h4v-2H7Z"],
      pin:["M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"],
      image:["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v12h16V6H4Zm3 2.5A1.5 1.5 0 1 0 10 8.5a1.5 1.5 0 0 0-3 0ZM5 17h14l-4.5-5.5-3.25 3.75L9 13l-4 4Z"],
      document:["M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V7h3.5L13 3.5ZM8 11v2h8v-2H8Zm0 4v2h8v-2H8Z"],
      life:["M12 3 2 11h3v9h6v-6h2v6h6v-9h3L12 3Z"],
      video:["M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm6 4v6l5-3-5-3Z"],
      audio:["M9 18V5l10-2v13a3 3 0 1 1-2-2.83V7L11 8v8a3 3 0 1 1-2-2.83Z"],
      developer:["M8.7 16.6 4.1 12l4.6-4.6L7.3 6 1.3 12l6 6 1.4-1.4Zm6.6 0L19.9 12l-4.6-4.6L16.7 6l6 6-6 6-1.4-1.4ZM10.5 20l4-16h-2l-4 16h2Z"]
    };
    var defs=paths[name]||paths.document;
    defs.forEach(function(d){
      var path=document.createElementNS(ns,"path");
      path.setAttribute("d",d);
      path.setAttribute("fill","currentColor");
      svg.appendChild(path);
    });
    return svg;
  }
  function iconName(tool){
    if(tool.type==="calculator"||tool.id==="calculator-hub")return "calculator";
    if(tool.type==="converter"||tool.id==="converter-hub")return "convert";
    return tool.icon||categoryMap[tool.category]&&categoryMap[tool.category].icon||"document";
  }
  function tone(tool){
    if(tool.type==="calculator")return "green";
    if(tool.type==="converter")return "orange";
    return categoryMap[tool.category]&&categoryMap[tool.category].tone||"blue";
  }
  function typeLabel(tool){
    if(tool.type==="calculator")return "계산기";
    if(tool.type==="converter")return "변환";
    if(tool.type==="collection")return "모음";
    return "웹도구";
  }
  function normalized(value){
    var text=String(value||"");
    if(text.normalize)text=text.normalize("NFKC");
    return text.toLowerCase()
      .replace(/㎡/g," m2 ")
      .replace(/[²]/g,"2")
      .replace(/[³]/g,"3")
      .replace(/[→↔⇄⇆/·,;:_\-]+/g," ")
      .replace(/[^0-9a-z가-힣+#.%]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }
  function compact(value){return normalized(value).replace(/\s+/g,"");}
  function queryTokens(value){return normalized(value).split(" ").filter(Boolean);}
  function withQuery(base,key,value){
    try{
      var url=new URL(base,window.location.href);
      url.searchParams.set(key,value);
      return url.toString();
    }catch(error){
      return base+(base.indexOf("?")===-1?"?":"&")+encodeURIComponent(key)+"="+encodeURIComponent(value);
    }
  }
  function loadExternalScript(src,key){
    var cacheKey=key||src;
    if(scriptPromises[cacheKey])return scriptPromises[cacheKey];
    scriptPromises[cacheKey]=new Promise(function(resolve,reject){
      var script=document.createElement("script");
      var timer=window.setTimeout(function(){
        reject(new Error("외부 검색 데이터를 불러오는 시간이 초과되었습니다."));
      },18000);
      script.async=true;
      script.src=src;
      script.onload=function(){window.clearTimeout(timer);resolve();};
      script.onerror=function(){window.clearTimeout(timer);reject(new Error("외부 검색 스크립트를 불러오지 못했습니다."));};
      (document.head||document.documentElement).appendChild(script);
    }).catch(function(error){delete scriptPromises[cacheKey];throw error;});
    return scriptPromises[cacheKey];
  }
  function purposeKeywords(categoryId){
    var category=categoryMap[categoryId];
    if(!category)return [];
    return [category.name,category.description].concat(category.intentTags||[]);
  }
  function trackingId(tool){
    if(tool.storageId)return tool.storageId;
    return (tool.type||"webtool")+":"+(tool.nativeId||tool.id);
  }
  function allCatalogTools(){
    var seen={};
    return tools.concat(calculatorTools,converterTools).filter(function(tool){
      if(!tool||!tool.available||!tool.url)return false;
      var key=trackingId(tool);
      if(seen[key])return false;
      seen[key]=true;
      return true;
    });
  }
  function directoryTools(){
    return allCatalogTools().filter(function(tool){return tool.type!=="collection"&&tool.showInDirectory!==false;});
  }
  function rebuildLookup(){
    toolLookup={};
    allCatalogTools().forEach(function(tool){toolLookup[trackingId(tool)]=tool;});
  }
  function toolByTrackingId(id){
    return toolLookup[String(id||"")]||null;
  }
  function numericDate(value){
    var parsed=Date.parse(value||"");
    return Number.isFinite(parsed)?parsed:0;
  }
  function stableToolSort(a,b){
    var popularDifference=(Number(b.serverScore)||0)-(Number(a.serverScore)||0);
    if(popularDifference)return popularDifference;
    var featuredDifference=Number(!!b.featured)-Number(!!a.featured);
    if(featuredDifference)return featuredDifference;
    var popularFlag=Number(!!b.popular)-Number(!!a.popular);
    if(popularFlag)return popularFlag;
    return (Number(a.featuredOrder)||Number(a.order)||9999)-(Number(b.featuredOrder)||Number(b.order)||9999)||String(a.name||"").localeCompare(String(b.name||""),"ko",{numeric:true,sensitivity:"base"});
  }
  function balancedTools(list,limit){
    var buckets={webtool:[],calculator:[],converter:[]};
    list.slice().sort(stableToolSort).forEach(function(tool){
      var bucket=buckets[tool.type]||buckets.webtool;
      bucket.push(tool);
    });
    var result=[];
    var order=["webtool","calculator","converter"];
    while(result.length<limit&&order.some(function(key){return buckets[key].length;})){
      order.forEach(function(key){if(result.length<limit&&buckets[key].length)result.push(buckets[key].shift());});
    }
    return result;
  }
  function calculatorCategory(item){
    var map={
      finance:"finance",
      "payroll-tax":"finance",
      health:"health",
      date:"date",
      "real-estate":"realestate",
      unit:"units",
      math:"math",
      science:"math",
      education:"math",
      auto:"life",
      life:"life"
    };
    if(item.category==="food")return item.subcategory==="nutrition"?"health":"life";
    return map[item.category]||"life";
  }
  function converterCategory(item){
    var map={
      pdf:"documents",document:"documents",hwp:"documents",ebook:"documents",archive:"documents",font:"documents",
      unit:"units",image:"images",color:"images",video:"media",audio:"media",subtitle:"media",
      developer:"developer",data:"developer",other:"life"
    };
    return map[item.category]||"documents";
  }
  function adaptCalculator(item){
    var category=calculatorCategory(item);
    return {
      id:"calculator:"+item.id,
      nativeId:item.id,
      type:"calculator",
      name:item.name||item.shortName||"계산기",
      shortName:item.shortName||item.name||"계산기",
      category:category,
      originalCategory:item.category||"",
      subcategory:item.subcategory||"",
      description:item.description||"입력값을 바탕으로 결과를 계산합니다.",
      aliases:Array.isArray(item.aliases)?item.aliases:[],
      keywords:(Array.isArray(item.keywords)?item.keywords:[]).concat(Array.isArray(item.aliases)?item.aliases:[]),
      intentTags:purposeKeywords(category),
      icon:"calculator",
      url:withQuery(CALCULATOR_PAGE_URL,"tool",item.id),
      available:true,
      featured:!!item.featured,
      featuredOrder:Number(item.featuredOrder)||9999,
      popular:!!item.popular,
      isNew:!!item.isNew,
      addedAt:item.addedAt||null,
      updatedAt:item.updatedAt||"",
      order:Number(item.order)||9999,
      storageId:"calculator:"+item.id
    };
  }
  function adaptConverter(item){
    var url="";
    var category=converterCategory(item);
    if(window.HM_CONVERTER_SEARCH&&typeof window.HM_CONVERTER_SEARCH.buildUrl==="function")url=window.HM_CONVERTER_SEARCH.buildUrl(CONVERTER_PAGE_URL,item);
    if(!url)url=withQuery(CONVERTER_PAGE_URL,"tool",item.id);
    return {
      id:"converter:"+item.id,
      nativeId:item.id,
      type:"converter",
      name:item.name||item.shortName||"변환 도구",
      shortName:item.shortName||item.name||"변환 도구",
      category:category,
      originalCategory:item.category||"",
      subcategory:item.subcategory||"",
      description:item.description||"형식이나 단위를 빠르게 변환합니다.",
      aliases:Array.isArray(item.normalizedAliases)?item.normalizedAliases:[],
      keywords:[item.normalizedKeywords||"",item.searchText||"",item.from||"",item.to||""],
      intentTags:purposeKeywords(category),
      icon:item.category==="image"?"image":item.category==="video"?"video":item.category==="audio"?"audio":item.category==="developer"?"developer":"convert",
      url:url,
      available:true,
      featured:!!item.featured,
      featuredOrder:Number(item.featuredOrder)||9999,
      popular:!!item.featured,
      isNew:!!item.isNew,
      addedAt:item.addedAt||null,
      updatedAt:item.updatedAt||"",
      order:Number(item.featuredOrder)||9999,
      storageId:"converter:"+item.id,
      sourceItem:item
    };
  }
  function updateHubCount(id,count,searchCount){
    var tool=tools.find(function(item){return item.id===id;});
    if(!tool||!count)return;
    var formatted=Number(count).toLocaleString("ko-KR");
    tool.collectionCount=Number(count);
    if(id==="calculator-hub"){
      tool.name="계산기 "+formatted+"종 모음";
      tool.shortName="계산기 "+formatted+"종";
      tool.description="생활, 금융, 건강, 날짜, 단위와 수학 계산기 "+formatted+"종을 한곳에서 이용합니다.";
      tool.keywords=["계산기","계산기 모음","계산기 "+formatted+"종","생활 계산기","금융 계산기","건강 계산기","날짜 계산기"];
    }else{
      tool.name="컨버터 "+formatted+"종 모음";
      tool.shortName="컨버터 "+formatted+"종";
      tool.description="파일, 문서, 이미지, 영상, 오디오와 단위 변환 도구 "+formatted+"종을 한곳에서 이용합니다."+(searchCount&&searchCount!==count?" 통합검색에는 중복을 제외한 "+Number(searchCount).toLocaleString("ko-KR")+"개가 노출됩니다.":"");
      tool.keywords=["컨버터","컨버터 모음","변환기","파일 변환","문서 변환","이미지 변환","단위 변환"];
    }
  }
  function refreshStaticViews(){
    rebuildLookup();
    renderUpdates();
    renderPersonal();
    renderPopular();
    renderSearched();
    renderLatest();
    renderCategories();
    renderAll();
    restartPopular();
  }
  function loadPublicManifests(){
    return Promise.all([
      loadExternalScript(withQuery(CALCULATOR_MANIFEST_URL,"t",Date.now()),"calculator-manifest"),
      loadExternalScript(withQuery(CONVERTER_MANIFEST_URL,"t",Date.now()),"converter-manifest")
    ]).then(function(){
      var calc=window.HM_CALCULATOR_CATALOG_MANIFEST;
      var conv=window.HM_CONVERTER_PUBLIC_MANIFEST;
      if(calc)updateHubCount("calculator-hub",Number(calc.publishedCount)||Number(calc.searchVisibleCount),Number(calc.searchVisibleCount));
      if(conv)updateHubCount("converter-hub",Number(conv.publishedCount),Number(conv.publishedSearchVisibleCount));
      refreshStaticViews();
    }).catch(function(){});
  }
  function ensureUnifiedCatalog(){
    if(unifiedCatalogPromise)return unifiedCatalogPromise;
    unifiedCatalogPromise=Promise.all([
      window.HM_CALCULATOR_CATALOG_LOADER?Promise.resolve():loadExternalScript(CALCULATOR_LOADER_URL,"calculator-loader"),
      window.HM_CONVERTER_SEARCH?Promise.resolve():loadExternalScript(CONVERTER_CLIENT_URL,"converter-client")
    ]).then(function(){
      if(!window.HM_CALCULATOR_CATALOG_LOADER||typeof window.HM_CALCULATOR_CATALOG_LOADER.load!=="function")throw new Error("계산기 카탈로그 로더를 찾지 못했습니다.");
      if(!window.HM_CONVERTER_SEARCH||typeof window.HM_CONVERTER_SEARCH.loadLatest!=="function")throw new Error("컨버터 검색 클라이언트를 찾지 못했습니다.");
      return Promise.all([
        window.HM_CALCULATOR_CATALOG_LOADER.load(),
        window.HM_CONVERTER_SEARCH.loadLatest()
      ]);
    }).then(function(result){
      calculatorTools=(result[0]||[]).map(adaptCalculator);
      converterTools=(result[1]||[]).map(adaptConverter);
      rebuildLookup();
      unifiedCatalogReady=true;
      unifiedCatalogError=null;
      var calcManifest=window.HM_CALCULATOR_CATALOG_LOADER.getManifest&&window.HM_CALCULATOR_CATALOG_LOADER.getManifest();
      var convManifest=window.HM_CONVERTER_SEARCH.manifest&&window.HM_CONVERTER_SEARCH.manifest();
      if(calcManifest)updateHubCount("calculator-hub",Number(calcManifest.publishedCount)||calculatorTools.length,calculatorTools.length);
      if(convManifest)updateHubCount("converter-hub",Number(convManifest.publishedCount)||converterTools.length,converterTools.length);
      refreshStaticViews();
      document.dispatchEvent(new CustomEvent("hm:webtools-catalog-ready",{detail:{calculators:calculatorTools.length,converters:converterTools.length,total:directoryTools().length}}));
      return calculatorTools.concat(converterTools);
    }).catch(function(error){
      unifiedCatalogError=error;
      unifiedCatalogReady=false;
      unifiedCatalogPromise=null;
      return [];
    });
    return unifiedCatalogPromise;
  }
  function searchableText(tool){
    return [tool.name,tool.shortName,tool.description,(tool.aliases||[]).join(" "),(tool.keywords||[]).join(" "),(tool.intentTags||[]).join(" "),categoryMap[tool.category]&&categoryMap[tool.category].name,categoryMap[tool.category]&&categoryMap[tool.category].description,typeLabel(tool)].join(" ");
  }
  function genericScore(tool,query){
    var tokens=queryTokens(query);
    if(!tokens.length)return -1;
    var hay=normalized(searchableText(tool));
    if(!tokens.every(function(token){return hay.indexOf(token)!==-1;}))return -1;
    var q=normalized(query);
    var qc=compact(query);
    var name=normalized(tool.name);
    var shortName=normalized(tool.shortName);
    var nameCompact=compact(tool.name);
    var shortCompact=compact(tool.shortName);
    var aliases=(tool.aliases||[]).map(normalized);
    var score=100;
    if(name===q||nameCompact===qc)score+=1600;
    if(shortName===q||shortCompact===qc)score+=1500;
    if(aliases.some(function(alias){return alias===q||compact(alias)===qc;}))score+=1300;
    if(name.indexOf(q)===0||nameCompact.indexOf(qc)===0)score+=650;
    if(shortName.indexOf(q)===0||shortCompact.indexOf(qc)===0)score+=600;
    if(tool.type==="collection")score-=260;
    if(categoryMap[tool.category]&&normalized(categoryMap[tool.category].name)===q)score+=240;
    if(tool.featured)score+=45;
    if(tool.isNew)score+=25;
    tokens.forEach(function(token){
      if(name.split(" ").indexOf(token)!==-1)score+=75;
      if(shortName.split(" ").indexOf(token)!==-1)score+=65;
      if(aliases.some(function(alias){return alias.indexOf(token)!==-1;}))score+=45;
    });
    return score;
  }
  function searchToolsDetailed(query){
    var rows=[];
    tools.forEach(function(tool,index){
      var score=genericScore(tool,query);
      if(score>=0)rows.push({tool:tool,score:score+120,index:index});
    });
    calculatorTools.forEach(function(tool,index){
      var score=genericScore(tool,query);
      if(score>=0)rows.push({tool:tool,score:score+80,index:1000+index});
    });
    if(window.HM_CONVERTER_SEARCH&&unifiedCatalogReady){
      var converted=window.HM_CONVERTER_SEARCH.search(query,{limit:Math.max(SEARCH_RESULT_LIMIT*2,100)});
      (converted.items||[]).forEach(function(item,index){
        rows.push({tool:adaptConverter(item),score:1550-index*3,index:10000+index});
      });
    }else{
      converterTools.forEach(function(tool,index){
        var score=genericScore(tool,query);
        if(score>=0)rows.push({tool:tool,score:score+60,index:10000+index});
      });
    }
    var unique={};
    rows=rows.filter(function(row){
      var key=row.tool.type+":"+(row.tool.nativeId||row.tool.id)+":"+row.tool.url;
      if(unique[key])return false;
      unique[key]=true;
      return true;
    });
    rows.sort(function(a,b){
      return b.score-a.score||String(a.tool.name||"").localeCompare(String(b.tool.name||""),"ko",{numeric:true,sensitivity:"base"})||a.index-b.index;
    });
    return {total:rows.length,items:rows.slice(0,SEARCH_RESULT_LIMIT).map(function(row){return row.tool;})};
  }
  function searchToolsAsync(query){
    return ensureUnifiedCatalog().then(function(){return searchToolsDetailed(query);});
  }
  function readUsageStore(){
    try{
      var value=JSON.parse(localStorage.getItem("hm-webtools-usage-v1")||"{}");
      return value&&typeof value==="object"&&value.items?value:{version:1,items:{}};
    }catch(error){return {version:1,items:{}};}
  }
  function rememberUsage(tool){
    try{
      var store=readUsageStore();
      var key=trackingId(tool);
      var previous=store.items[key]||{};
      store.items[key]={
        count:(Number(previous.count)||0)+1,
        lastUsedAt:new Date().toISOString(),
        tool:{
          storageId:key,id:tool.id,nativeId:tool.nativeId||"",type:tool.type||"webtool",name:tool.name||"웹도구",
          shortName:tool.shortName||tool.name||"웹도구",description:tool.description||"",category:tool.category||"life",
          icon:iconName(tool),url:tool.url,updatedAt:tool.updatedAt||"",available:true
        }
      };
      var ordered=Object.keys(store.items).sort(function(a,b){
        var left=store.items[a],right=store.items[b];
        return (Number(right.count)||0)-(Number(left.count)||0)||String(right.lastUsedAt||"").localeCompare(String(left.lastUsedAt||""));
      });
      ordered.slice(100).forEach(function(id){delete store.items[id];});
      localStorage.setItem("hm-webtools-usage-v1",JSON.stringify(store));
      renderPersonal();
    }catch(error){}
  }
  function sendAnalytics(tool,source){
    if(!ANALYTICS_BASE_URL)return;
    var actions=["open"];
    if(source==="search")actions.push("search_click");
    var payload=JSON.stringify({
      toolId:trackingId(tool),
      toolType:tool.type||"webtool",
      category:tool.category||"life",
      actions:actions
    });
    var url=ANALYTICS_BASE_URL+"/api/event";
    try{
      if(navigator.sendBeacon){
        var blob=new Blob([payload],{type:"text/plain;charset=UTF-8"});
        if(navigator.sendBeacon(url,blob))return;
      }
    }catch(error){}
    try{fetch(url,{method:"POST",mode:"cors",keepalive:true,headers:{"Content-Type":"text/plain;charset=UTF-8"},body:payload}).catch(function(){});}catch(error){}
  }
  function recordToolUse(tool,source){
    rememberUsage(tool);
    sendAnalytics(tool,source||"direct");
    try{
      var key=trackingId(tool);
      var recent=JSON.parse(localStorage.getItem("hm-webtools-recent-v2")||"[]");
      recent=recent.filter(function(item){return item&&item.key!==key;});
      recent.unshift({
        key:key,id:tool.id,nativeId:tool.nativeId||"",type:tool.type||"webtool",name:tool.name||"웹도구",
        shortName:tool.shortName||tool.name||"웹도구",description:tool.description||"",category:tool.category||"life",
        icon:iconName(tool),url:tool.url,updatedAt:tool.updatedAt||""
      });
      localStorage.setItem("hm-webtools-recent-v2",JSON.stringify(recent.slice(0,10)));
    }catch(error){}
  }
  function openTool(tool,source){
    recordToolUse(tool,source);
    window.location.href=tool.url;
  }
  function makeCard(tool,className,source){
    var button=element("a",className);
    button.href=tool.url;
    button.dataset.tone=tone(tool);
    button.setAttribute("aria-label",tool.name+" 열기");
    var iconBox=element("span","hm-tools-icon-box");
    iconBox.appendChild(className.indexOf("hm-tools-popular-card")!==-1?popularSvgIcon(iconName(tool)):svgIcon(iconName(tool)));
    var copy=element("span","hm-tools-card-copy");
    if(className.indexOf("hm-tools-result-card")!==-1){
      copy.appendChild(element("span","hm-tools-result-badge hm-tools-result-badge-"+(tool.type||"webtool"),typeLabel(tool)));
    }
    copy.append(
      element("strong","hm-tools-card-title",tool.shortName||tool.name),
      element("span","hm-tools-card-desc",tool.description)
    );
    if(className.indexOf("hm-tools-popular-card")!==-1){
      var category=categoryMap[tool.category];
      copy.appendChild(
        element(
          "span",
          "hm-tools-card-badge",
          category ? category.name+" 도구" : "바로 사용"
        )
      );
    }
    var arrow=svgIcon("arrow");
    arrow.setAttribute("class","hm-tools-card-arrow");
    button.append(iconBox,copy,arrow);
    button.addEventListener("click",function(){recordToolUse(tool,source||"directory");});
    return button;
  }
  function latestLabel(tool){
    if(tool.isNew)return "NEW";
    if(tool.addedAt&&tool.updatedAt&&numericDate(tool.updatedAt)>numericDate(tool.addedAt))return "UPD";
    return "NEW";
  }
  function latestTools(){
    var now=Date.now();
    return directoryTools().filter(function(tool){
      if(tool.isNew)return true;
      if(!tool.addedAt)return false;
      var age=now-numericDate(tool.addedAt);
      var updatedAge=now-numericDate(tool.updatedAt);
      return age>=0&&age<=1000*60*60*24*120||updatedAge>=0&&updatedAge<=1000*60*60*24*45;
    }).sort(function(a,b){
      return Math.max(numericDate(b.addedAt),numericDate(b.updatedAt))-Math.max(numericDate(a.addedAt),numericDate(a.updatedAt))||Number(!!b.isNew)-Number(!!a.isNew);
    });
  }
  function renderUpdates(){
    if(!updateTrack)return;
    var latest=latestTools().slice(0,8);
    updateTrack.replaceChildren();
    if(!latest.length){
      var empty=element("span","hm-tools-update-item","새 도구 목록을 준비하고 있습니다.");
      updateTrack.appendChild(empty);
      return;
    }
    latest.concat(latest).forEach(function(tool){
      var item=element("a","hm-tools-update-item");
      item.href=tool.url;
      item.append(element("span","hm-tools-new-badge",latestLabel(tool)),element("span","",tool.shortName||tool.name),element("span","hm-tools-update-date",tool.addedAt||tool.updatedAt||""));
      item.addEventListener("click",function(){recordToolUse(tool,"latest");});
      updateTrack.appendChild(item);
    });
  }
  function startUpdateTicker(){
    window.clearInterval(updateTimer);
    updateTimer=window.setInterval(function(){
      if(document.hidden||hero.classList.contains("is-searching"))return;
      var items=updateTrack.children;
      if(!items.length)return;
      updateIndex=(updateIndex+1)%Math.max(1,Math.floor(items.length/2));
      var target=items[updateIndex];
      updateTrack.style.transform="translateX("+(-target.offsetLeft)+"px)";
    },6500);
  }
  function renderSearch(query){
    var requestId=++searchRequestId;
    resultsGrid.replaceChildren();
    resultsMeta.textContent="최신 계산 및 변환 도구 목록을 불러오는 중입니다.";
    resultsGrid.appendChild(element("div","hm-tools-catalog-status","계산기와 변환 도구를 연결하고 있습니다."));
    hero.classList.add("is-searching");
    searchToolsAsync(query).then(function(result){
      if(requestId!==searchRequestId)return;
      resultsGrid.replaceChildren();
      var shown=result.items.length;
      resultsMeta.textContent="검색어: "+query+" / 총 "+result.total.toLocaleString("ko-KR")+"개"+(result.total>shown?" 중 "+shown+"개 표시":"");
      if(!shown){
        var empty=element("div","hm-tools-empty",unifiedCatalogError?"외부 목록 일부를 불러오지 못했습니다. 기존 웹도구 검색 결과만 표시합니다.":"조건에 맞는 도구를 찾지 못했습니다. 검색어를 짧게 바꿔보세요.");
        resultsGrid.appendChild(empty);
      }else{
        result.items.forEach(function(tool){resultsGrid.appendChild(makeCard(tool,"hm-tools-result-card","search"));});
      }
    });
  }
  function closeSearch(){
    input.value="";
    form.classList.remove("has-value");
    hero.classList.remove("is-searching");
    resultsGrid.replaceChildren();
    resultsMeta.textContent="";
    updateIndex=0;
    updateTrack.style.transform="translateX(0)";
    input.focus();
  }
  form.addEventListener("submit",function(event){
    event.preventDefault();
    var query=input.value.trim();
    if(!query){input.focus();return;}
    window.clearTimeout(searchInputTimer);
    renderSearch(query);
  });
  input.addEventListener("focus",function(){ensureUnifiedCatalog();},{once:true});
  input.addEventListener("input",function(){
    form.classList.toggle("has-value",Boolean(input.value));
    if(hero.classList.contains("is-searching")){
      var query=input.value.trim();
      window.clearTimeout(searchInputTimer);
      if(query){searchInputTimer=window.setTimeout(function(){renderSearch(query);},180);}else closeSearch();
    }
  });
  clearButton.addEventListener("click",closeSearch);

  function automaticFallbackTools(limit){
    var catalog=directoryTools();
    var preferred=catalog.filter(function(tool){return tool.featured||tool.popular||tool.isNew;});
    var merged=preferred.concat(catalog);
    var seen={};
    var unique=merged.filter(function(tool){
      var key=trackingId(tool);
      if(seen[key])return false;
      seen[key]=true;
      return true;
    });
    return balancedTools(unique,limit);
  }
  function fillRankedTools(ranked,limit){
    var result=ranked.slice();
    var seen={};
    result.forEach(function(tool){seen[trackingId(tool)]=true;});
    automaticFallbackTools(limit*2).forEach(function(tool){
      var key=trackingId(tool);
      if(result.length<limit&&!seen[key]){seen[key]=true;result.push(tool);}
    });
    return result.slice(0,limit);
  }
  function rankTools(rows,limit){
    var result=[];
    (rows||[]).forEach(function(row){
      var tool=toolByTrackingId(row.toolId);
      if(tool){tool.serverScore=Number(row.score)||0;result.push(tool);}
    });
    return result.slice(0,limit);
  }
  function popularTools(){
    return fillRankedTools(rankTools(globalRankings.popular,14),12);
  }
  function searchedTools(){
    return fillRankedTools(rankTools(globalRankings.searched,10),8);
  }
  function personalFrequentTools(){
    var store=readUsageStore();
    return Object.keys(store.items||{}).map(function(key){
      var item=store.items[key];
      var live=toolByTrackingId(key);
      var tool=live||item.tool;
      if(!tool||!tool.url)return null;
      tool.personalCount=Number(item.count)||0;
      tool.personalLastUsedAt=item.lastUsedAt||"";
      return tool;
    }).filter(Boolean).sort(function(a,b){return (b.personalCount||0)-(a.personalCount||0)||String(b.personalLastUsedAt||"").localeCompare(String(a.personalLastUsedAt||""));}).slice(0,8);
  }
  function renderPersonal(){
    if(!personalGrid)return;
    var list=personalFrequentTools();
    var hasUsage=list.length>0;
    if(!hasUsage)list=automaticFallbackTools(8);
    personalTitle.textContent=hasUsage?"나의 자주 쓰는 도구":"처음 쓰기 좋은 추천 도구";
    personalDesc.textContent=hasUsage?"이 브라우저에서 사용한 횟수와 최근 이용 순서로 자동 정렬됩니다.":"사용 기록이 쌓이면 나의 자주 쓰는 도구로 자동 교체됩니다.";
    personalGrid.replaceChildren();
    list.slice(0,8).forEach(function(tool){personalGrid.appendChild(makeCard(tool,"hm-tools-tool-card",hasUsage?"personal":"recommended"));});
  }
  function makeRankCard(tool,index){
    var button=element("a","hm-tools-rank-card");
    button.href=tool.url;
    button.dataset.tone=tone(tool);
    button.appendChild(element("span","hm-tools-rank-number",String(index+1)));
    var icon=element("span","hm-tools-icon-box");
    icon.appendChild(svgIcon(iconName(tool)));
    var copy=element("span","hm-tools-card-copy");
    copy.append(element("strong","hm-tools-card-title",tool.shortName||tool.name),element("span","hm-tools-card-desc",categoryMap[tool.category]?categoryMap[tool.category].name:typeLabel(tool)));
    button.append(icon,copy,svgIcon("arrow"));
    button.lastChild.setAttribute("class","hm-tools-card-arrow");
    button.addEventListener("click",function(){recordToolUse(tool,"searched");});
    return button;
  }
  function renderSearched(){
    if(!searchedGrid)return;
    var list=searchedTools();
    searchedGrid.replaceChildren();
    list.slice(0,8).forEach(function(tool,index){searchedGrid.appendChild(makeRankCard(tool,index));});
    if(searchedStatus)searchedStatus.textContent=rankingsReady&&rankTools(globalRankings.searched,1).length?"최근 30일 검색 결과 선택 기준":"통계가 쌓이기 전에는 대표 도구를 표시합니다.";
  }
  function makeLatestCard(tool){
    var card=makeCard(tool,"hm-tools-result-card","latest");
    var badge=card.querySelector(".hm-tools-result-badge");
    if(badge)badge.textContent=latestLabel(tool)+" / "+typeLabel(tool);
    var desc=card.querySelector(".hm-tools-card-desc");
    if(desc)desc.textContent=(tool.addedAt||tool.updatedAt||"")+" / "+tool.description;
    return card;
  }
  function renderLatest(){
    if(!latestGrid)return;
    var list=latestTools().slice(0,8);
    latestGrid.replaceChildren();
    list.forEach(function(tool){latestGrid.appendChild(makeLatestCard(tool));});
    if(!list.length)latestGrid.appendChild(element("div","hm-tools-empty","새 도구 목록을 준비하고 있습니다."));
    if(latestStatus)latestStatus.textContent=unifiedCatalogReady?"계산, 변환, 웹도구를 등록일순으로 통합":"전체 카탈로그를 불러오는 중입니다.";
  }
  function fetchRankings(){
    if(rankingsPromise||!ANALYTICS_BASE_URL)return rankingsPromise||Promise.resolve(globalRankings);
    rankingsPromise=fetch(ANALYTICS_BASE_URL+"/api/rankings?limit=20",{method:"GET",mode:"cors",cache:"no-store"}).then(function(response){if(!response.ok)throw new Error("ranking http "+response.status);return response.json();}).then(function(payload){
      globalRankings.popular=Array.isArray(payload.popular)?payload.popular:[];
      globalRankings.searched=Array.isArray(payload.searched)?payload.searched:[];
      rankingsReady=true;rankingsError=null;
      renderPopular();renderSearched();restartPopular();
      if(popularStatus)popularStatus.textContent=rankTools(globalRankings.popular,1).length?"최근 30일 익명 실행 기준":"통계가 쌓이기 전에는 대표 도구를 표시합니다.";
      return globalRankings;
    }).catch(function(error){rankingsError=error;rankingsReady=false;rankingsPromise=null;if(popularStatus)popularStatus.textContent="통계 연결 전 대표 도구를 표시합니다.";renderPopular();renderSearched();return globalRankings;});
    return rankingsPromise;
  }
  var popularLoopWidth=0;
  var popularAutoTimer=0;
  var popularScrollFrame=0;
  var popularPaused=false;
  var popularResumeTimer=0;
  var popularAutoDelay=5600;
  var popularSlideDuration=1350;
  var popularDrag={active:false,moved:false,startX:0,startLeft:0,pointerId:null};

  function visiblePopularCount(){
    if(window.innerWidth<=760)return 2.5;
    if(window.innerWidth<=1100)return 3;
    return 5;
  }

  function popularCards(){
    return Array.prototype.slice.call(popularTrack.children);
  }

  function updatePopularMetrics(){
    if(!popularViewport||!popularTrack)return;

    var count=visiblePopularCount();
    var styles=window.getComputedStyle(popularTrack);
    var gap=parseFloat(styles.columnGap||styles.gap)||12;
    var width=(popularViewport.clientWidth-gap*(count-1))/count;
    width=Math.max(window.innerWidth<=760?126:174,width);
    popularViewport.style.setProperty("--hm-popular-card-width",width.toFixed(2)+"px");

    window.requestAnimationFrame(function(){
      var cards=popularCards();
      var half=Math.floor(cards.length/2);
      if(!half||!cards[half])return;
      popularLoopWidth=cards[half].offsetLeft-cards[0].offsetLeft;
      normalizePopularLoop();
    });
  }

  function renderPopular(){
    popularTrack.replaceChildren();
    var list=popularTools();

    list.forEach(function(tool){
      popularTrack.appendChild(makeCard(tool,"hm-tools-popular-card","popular"));
    });

    list.forEach(function(tool){
      var card=makeCard(tool,"hm-tools-popular-card","popular");
      card.dataset.hmClone="true";
      card.setAttribute("aria-hidden","true");
      card.tabIndex=-1;
      popularTrack.appendChild(card);
    });

    popularViewport.scrollLeft=0;
    updatePopularMetrics();
  }

  function normalizePopularLoop(){
    if(!popularLoopWidth||!popularViewport)return;
    var left=popularViewport.scrollLeft;
    if(left>=popularLoopWidth){
      popularViewport.scrollLeft=left-popularLoopWidth;
    }else if(left<0){
      popularViewport.scrollLeft=left+popularLoopWidth;
    }
  }

  function cancelPopularMotion(){
    if(popularScrollFrame){
      window.cancelAnimationFrame(popularScrollFrame);
      popularScrollFrame=0;
    }
  }

  function easePopular(value){
    return .5-Math.cos(Math.PI*value)/2;
  }

  function animatePopularTo(target,duration,done){
    cancelPopularMotion();
    var start=popularViewport.scrollLeft;
    var distance=target-start;
    var began=0;

    function frame(time){
      if(!began)began=time;
      var progress=Math.min(1,(time-began)/duration);
      popularViewport.scrollLeft=start+distance*easePopular(progress);
      if(progress<1){
        popularScrollFrame=window.requestAnimationFrame(frame);
      }else{
        popularScrollFrame=0;
        normalizePopularLoop();
        if(typeof done==="function")done();
      }
    }

    popularScrollFrame=window.requestAnimationFrame(frame);
  }

  function popularStepAmount(){
    var card=popularTrack.querySelector(".hm-tools-popular-card");
    var styles=window.getComputedStyle(popularTrack);
    var gap=parseFloat(styles.columnGap||styles.gap)||12;
    return (card?card.getBoundingClientRect().width:210)+gap;
  }

  function clearPopularAuto(){
    window.clearTimeout(popularAutoTimer);
    popularAutoTimer=0;
  }

  function schedulePopular(delay){
    clearPopularAuto();
    popularAutoTimer=window.setTimeout(function tick(){
      if(!popularPaused&&!document.hidden&&popularLoopWidth>0){
        normalizePopularLoop();
        animatePopularTo(popularViewport.scrollLeft+popularStepAmount(),popularSlideDuration,function(){
          schedulePopular(popularAutoDelay);
        });
      }else{
        schedulePopular(700);
      }
    },delay||popularAutoDelay);
  }

  function pausePopular(){
    popularPaused=true;
    window.clearTimeout(popularResumeTimer);
    clearPopularAuto();
    cancelPopularMotion();
  }

  function resumePopular(delay){
    window.clearTimeout(popularResumeTimer);
    popularResumeTimer=window.setTimeout(function(){
      popularPaused=false;
      schedulePopular(popularAutoDelay);
    },delay||0);
  }

  function restartPopular(){
    popularPaused=false;
    clearPopularAuto();
    cancelPopularMotion();
    schedulePopular(2200);
  }

  function movePopular(step){
    pausePopular();
    normalizePopularLoop();
    var amount=popularStepAmount();
    if(step<0&&popularViewport.scrollLeft<amount*.5&&popularLoopWidth>0){
      popularViewport.scrollLeft+=popularLoopWidth;
    }
    animatePopularTo(popularViewport.scrollLeft+amount*step,1000,function(){
      normalizePopularLoop();
      resumePopular(1700);
    });
  }

  var popularPrev=document.querySelector("[data-hm-tools-popular-prev]");
  var popularNext=document.querySelector("[data-hm-tools-popular-next]");
  if(popularPrev)popularPrev.addEventListener("click",function(){movePopular(-1);});
  if(popularNext)popularNext.addEventListener("click",function(){movePopular(1);});

  popularViewport.addEventListener("focusin",pausePopular);
  popularViewport.addEventListener("focusout",function(){resumePopular(500);});
  popularViewport.addEventListener("touchstart",pausePopular,{passive:true});
  popularViewport.addEventListener("touchend",function(){normalizePopularLoop();resumePopular(1300);},{passive:true});
  popularViewport.addEventListener("touchcancel",function(){normalizePopularLoop();resumePopular(1300);},{passive:true});

  var POPULAR_MOUSE_DRAG_THRESHOLD=12;
  popularDrag.dragging=false;
  popularDrag.suppressClick=false;

  popularViewport.addEventListener("pointerdown",function(event){
    if(event.pointerType!=="mouse"||event.button!==0)return;
    popularDrag.active=true;
    popularDrag.dragging=false;
    popularDrag.moved=false;
    popularDrag.suppressClick=false;
    popularDrag.startX=event.clientX;
    popularDrag.startLeft=popularViewport.scrollLeft;
    popularDrag.pointerId=event.pointerId;
  });

  popularViewport.addEventListener("pointermove",function(event){
    if(!popularDrag.active||event.pointerId!==popularDrag.pointerId)return;
    var dx=event.clientX-popularDrag.startX;
    if(!popularDrag.dragging){
      if(Math.abs(dx)<POPULAR_MOUSE_DRAG_THRESHOLD)return;
      popularDrag.dragging=true;
      popularDrag.moved=true;
      popularDrag.suppressClick=true;
      popularViewport.classList.add("is-dragging");
      pausePopular();
      try{popularViewport.setPointerCapture(event.pointerId);}catch(error){}
    }
    if(event.cancelable)event.preventDefault();
    popularViewport.scrollLeft=popularDrag.startLeft-dx;
  });

  function finishPopularDrag(event){
    if(!popularDrag.active)return;
    var wasDragging=popularDrag.dragging;
    var pointerId=popularDrag.pointerId;
    popularDrag.active=false;
    popularDrag.dragging=false;
    popularDrag.pointerId=null;
    popularViewport.classList.remove("is-dragging");
    try{
      if(pointerId!==null&&popularViewport.hasPointerCapture(pointerId)){
        popularViewport.releasePointerCapture(pointerId);
      }
    }catch(error){}
    if(wasDragging)normalizePopularLoop();
    resumePopular(wasDragging?1400:500);
    if(wasDragging){
      window.setTimeout(function(){
        popularDrag.moved=false;
        popularDrag.suppressClick=false;
      },180);
    }else{
      popularDrag.moved=false;
      popularDrag.suppressClick=false;
    }
  }

  popularViewport.addEventListener("pointerup",finishPopularDrag);
  popularViewport.addEventListener("pointercancel",finishPopularDrag);
  popularViewport.addEventListener("lostpointercapture",finishPopularDrag);
  popularViewport.addEventListener("click",function(event){
    if(popularDrag.suppressClick){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);

  window.addEventListener("resize",function(){
    cancelPopularMotion();
    updatePopularMetrics();
    normalizePopularLoop();
  });

  document.addEventListener("visibilitychange",function(){
    if(document.hidden){
      clearPopularAuto();
      cancelPopularMotion();
    }else{
      resumePopular(500);
    }
  });

  function focusAllToolsSection(){
    var section=document.getElementById("hm-tools-all-title");
    if(!section)return;
    var target=Math.max(0,section.getBoundingClientRect().top+window.scrollY-88);
    window.scrollTo({top:target,behavior:"smooth"});
  }
  function renderCategories(){
    categoryBar.replaceChildren();
    var all={id:"all",name:"추천",icon:"all"};
    var catalog=directoryTools();
    [all].concat(categories).forEach(function(category){
      var button=element("button","hm-tools-category-button");
      button.type="button";
      button.dataset.category=category.id;
      button.classList.toggle("is-active",currentCategory===category.id);
      var count=category.id==="all"?catalog.length:catalog.filter(function(tool){return tool.category===category.id;}).length;
      button.append(svgIcon(category.icon||"document"),element("span","",category.name),element("small","hm-tools-category-count",count?count.toLocaleString("ko-KR")+"개":""));
      button.addEventListener("click",function(){
        currentCategory=category.id;
        renderCategories();
        renderAll();
        if(!unifiedCatalogReady)ensureUnifiedCatalog();
        focusAllToolsSection();
      });
      categoryBar.appendChild(button);
    });
  }
  function renderAll(){
    allGrid.replaceChildren();
    var catalog=directoryTools();
    var filtered=currentCategory==="all"?catalog:catalog.filter(function(tool){return tool.category===currentCategory;});
    var limit=Math.max(12,Number(data.settings.directoryLimit)||24);
    var list=balancedTools(filtered,limit);
    if(!list.length){allGrid.appendChild(element("div","hm-tools-empty","해당 분야의 도구를 준비하고 있습니다."));return;}
    list.forEach(function(tool){allGrid.appendChild(makeCard(tool,"hm-tools-tool-card","category"));});
  }
  function showLayer(layer){
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("hm-tools-layer-open");
    if(bottomNav)bottomNav.classList.add("hm-bottom-nav-layer-open");
  }
  function hideLayer(layer){
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden","true");
    if(!shareOverlay.classList.contains("is-open")&&!sheetOverlay.classList.contains("is-open")){
      document.documentElement.classList.remove("hm-tools-layer-open");
      if(bottomNav)bottomNav.classList.remove("hm-bottom-nav-layer-open");
    }
  }
  function openShare(){
    showLayer(shareOverlay);
    var close=shareOverlay.querySelector("[data-hm-tools-share-close]");
    if(close)close.focus();
  }
  function closeShare(){
    hideLayer(shareOverlay);
  }
  function shareData(){
    var image=document.querySelector('meta[property="og:image"]');
    var hiddenImage=document.querySelector('div[style*="display:none"] img');
    return {
      url:window.location.href,
      title:document.title||"힐링편의점 웹도구 모음",
      text:"필요한 웹도구를 한곳에서 찾아보세요.",
      image:image&&image.content?image.content:(hiddenImage?hiddenImage.src:"")
    };
  }
  function openPopup(url){
    window.open(url,"_blank","noopener,noreferrer,width=720,height=720");
  }
  function copyText(value){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function(resolve,reject){
      var area=document.createElement("textarea");
      area.value=value;
      area.setAttribute("readonly","");
      area.style.position="fixed";
      area.style.opacity="0";
      document.body.appendChild(area);
      area.select();
      try{
        document.execCommand("copy");
        resolve();
      }catch(error){
        reject(error);
      }
      area.remove();
    });
  }
  function handleShare(action){
    var d=shareData();
    if(action==="kakao"){
      try{
        if(window.Kakao){
          if(!window.Kakao.isInitialized()){
            window.Kakao.init("a6897bdb5b7785b0ffbe542d81886b93");
          }
          window.Kakao.Share.sendDefault({
            objectType:"feed",
            content:{
              title:d.title,
              description:d.text,
              imageUrl:d.image,
              link:{mobileWebUrl:d.url,webUrl:d.url}
            }
          });
          return;
        }
      }catch(error){}
      if(navigator.share){
        navigator.share({title:d.title,text:d.text,url:d.url}).catch(function(){});
        return;
      }
      copyText(d.url).then(function(){showToast("주소를 복사했습니다.");});
      return;
    }
    if(action==="naver"){openPopup("https://share.naver.com/web/shareView?url="+encodeURIComponent(d.url)+"&title="+encodeURIComponent(d.title));return;}
    if(action==="facebook"){openPopup("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(d.url));return;}
    if(action==="x"){openPopup("https://twitter.com/intent/tweet?url="+encodeURIComponent(d.url)+"&text="+encodeURIComponent(d.title));return;}
    if(action==="threads"){openPopup("https://www.threads.net/intent/post?text="+encodeURIComponent(d.title+"\\n"+d.url));return;}
    if(action==="band"){openPopup("https://band.us/plugin/share?body="+encodeURIComponent(d.title+"\\n"+d.url));return;}
    if(action==="telegram"){openPopup("https://t.me/share/url?url="+encodeURIComponent(d.url)+"&text="+encodeURIComponent(d.title));return;}
    if(action==="copy"){
      copyText(d.url).then(function(){showToast("주소를 복사했습니다.");}).catch(function(){showToast("주소 복사에 실패했습니다.");});
    }
  }
  function recentTools(){
    try{
      var saved=JSON.parse(localStorage.getItem("hm-webtools-recent-v2")||"[]");
      if(Array.isArray(saved)&&saved.length){
        return saved.filter(function(item){return item&&item.url;}).map(function(item){
          item.storageId=item.key;
          item.available=true;
          return item;
        });
      }
      var ids=JSON.parse(localStorage.getItem("hm-webtools-recent")||"[]");
      return ids.map(function(id){return tools.find(function(tool){return tool.id===id;});}).filter(Boolean);
    }catch(error){
      return [];
    }
  }
  function sheetToneForCategory(category){
    return category&&category.tone?category.tone:"blue";
  }
  function sheetToolCard(tool,subtext,source){
    var button=element("a","hm-tools-sheet-card");
    button.href=tool.url;
    button.dataset.tone=tone(tool);
    var icon=element("span","hm-tools-icon-box");
    icon.appendChild(svgIcon(iconName(tool)));
    var copy=element("span","hm-tools-sheet-copy");
    copy.append(element("strong","",tool.shortName||tool.name),element("small","",subtext||tool.description));
    button.append(icon,copy);
    button.addEventListener("click",function(){hideLayer(sheetOverlay);recordToolUse(tool,source||"sheet");});
    return button;
  }
  function sheetCategoryCard(category,count){
    var button=element("button","hm-tools-sheet-category");
    button.type="button";
    button.dataset.tone=sheetToneForCategory(category);
    var icon=element("span","hm-tools-icon-box");
    icon.appendChild(svgIcon(category.icon||"document"));
    var name=element("strong","hm-tools-sheet-category-name",category.name);
    var countLabel=element("span","hm-tools-sheet-count",count?count+"개":"준비중");
    button.append(icon,name,countLabel);
    button.addEventListener("click",function(){
      currentCategory=category.id;
      renderCategories();
      renderAll();
      hideLayer(sheetOverlay);
      focusAllToolsSection();
    });
    return button;
  }
  function sheetTitleNode(label,description){
    var node=element("div","hm-tools-sheet-section-title");
    node.appendChild(element("strong","",label));
    if(description)node.appendChild(element("small","",description));
    return node;
  }
  function sheetGrid(type){
    var grid=element("div","hm-tools-sheet-grid");
    if(type)grid.classList.add("hm-tools-sheet-grid-"+type);
    return grid;
  }
  function appendPopularSheetTools(parent,limit){
    var grid=sheetGrid("tools");
    popularTools().slice(0,limit||6).forEach(function(tool){grid.appendChild(sheetToolCard(tool,"최근 이용 기준 인기 도구"));});
    parent.append(sheetTitleNode("많이 사용하는 도구","최근 실행 순위를 반영합니다."),grid);
  }
  function appendSheetSearch(parent,options){
    options=options||{};
    var wrap=element("form","hm-tools-sheet-search-wrap");
    wrap.setAttribute("role","search");

    var icon=svgIcon("search");
    icon.setAttribute("class","hm-tools-sheet-search-icon");

    var searchInput=element("input","hm-tools-sheet-search-input");
    searchInput.type="search";
    searchInput.autocomplete="off";
    searchInput.placeholder=window.innerWidth<=760
      ?"예: 대출 이자, 평수, PDF JPG"
      :"예: 대출 이자, 디데이, 평수, PDF JPG, 글자수";
    searchInput.setAttribute("aria-label","빠른 웹도구 검색");

    var submit=element("button","hm-tools-sheet-search-button","검색");
    submit.type="submit";
    wrap.append(icon,searchInput,submit);

    var guide=element(
      "div",
      "hm-tools-sheet-search-guide",
      "도구 이름이나 사용 목적을 입력하세요."
    );

    var resultTitle=element("div","hm-tools-sheet-result-title");
    var resultLabel=element("strong","","검색 결과");
    var resultCount=element("span","","0개");
    resultTitle.append(resultLabel,resultCount);

    var resultGrid=sheetGrid("tools");
    resultTitle.hidden=true;
    resultGrid.hidden=true;

    var sheetRequestId=0;
    var sheetTimer=0;
    function runSearch(){
      var query=searchInput.value.trim();
      var requestId=++sheetRequestId;

      if(!query){
        guide.hidden=false;
        guide.textContent="도구 이름이나 사용 목적을 입력하세요.";
        resultTitle.hidden=true;
        resultGrid.hidden=true;
        resultGrid.replaceChildren();
        return;
      }

      guide.hidden=false;
      guide.textContent="최신 계산 및 변환 도구 목록을 불러오는 중입니다.";
      resultTitle.hidden=false;
      resultGrid.hidden=false;
      resultGrid.replaceChildren();
      resultGrid.appendChild(element("div","hm-tools-catalog-status","통합검색을 준비하고 있습니다."));

      searchToolsAsync(query).then(function(result){
        if(requestId!==sheetRequestId)return;
        guide.hidden=true;
        resultCount.textContent=result.total.toLocaleString("ko-KR")+"개"+(result.total>result.items.length?" 중 "+result.items.length+"개 표시":"");
        resultGrid.replaceChildren();
        if(!result.items.length){
          resultGrid.appendChild(element("div","hm-tools-sheet-empty","조건에 맞는 도구가 없습니다."));
        }else{
          result.items.forEach(function(tool){resultGrid.appendChild(sheetToolCard(tool,typeLabel(tool)+" / "+tool.description,"search"));});
        }
      });
    }

    wrap.addEventListener("submit",function(event){
      event.preventDefault();
      window.clearTimeout(sheetTimer);
      runSearch();
    });
    searchInput.addEventListener("focus",function(){ensureUnifiedCatalog();},{once:true});
    searchInput.addEventListener("input",function(){
      window.clearTimeout(sheetTimer);
      sheetTimer=window.setTimeout(runSearch,180);
    });

    parent.append(wrap,guide,resultTitle,resultGrid);

    if(options.focus){
      window.setTimeout(function(){searchInput.focus();},80);
    }
  }
  function openSheet(type){
    sheetList.replaceChildren();
    if(type==="search"){
      sheetTitle.textContent="원하는 웹도구를 직접 찾아보세요";
      if(sheetSubtitle)sheetSubtitle.textContent="도구 이름이나 사용 목적으로 바로 찾을 수 있어요.";

      sheetList.appendChild(
        sheetTitleNode("웹도구 검색","이름이나 용도를 입력하세요.")
      );
      appendSheetSearch(sheetList,{focus:true});
      appendPopularSheetTools(sheetList,6);
    }else if(type==="recent"){
      sheetTitle.textContent="최근 사용한 웹도구";
      if(sheetSubtitle)sheetSubtitle.textContent="최근 열어본 도구를 다시 빠르게 이용하세요.";
      sheetList.appendChild(
        sheetTitleNode("최근 사용한 웹도구","최근 열어본 도구입니다.")
      );
      var recent=recentTools();
      var recentGrid=sheetGrid("tools");
      if(!recent.length){recentGrid.appendChild(element("div","hm-tools-sheet-empty","아직 사용 기록이 없습니다."));}
      else{recent.forEach(function(tool){recentGrid.appendChild(sheetToolCard(tool,"최근 사용","recent"));});}
      sheetList.append(recentGrid);
      sheetList.appendChild(
        sheetTitleNode("웹도구 검색","다른 도구를 바로 찾아보세요.")
      );
      appendSheetSearch(sheetList);
    }else if(type==="latest"){
      sheetTitle.textContent="새로 나온 웹도구";
      if(sheetSubtitle)sheetSubtitle.textContent="최근 공개되거나 업데이트된 웹도구입니다.";
      sheetList.appendChild(
        sheetTitleNode("새로 나온 웹도구","최근 공개되거나 업데이트된 도구입니다.")
      );
      var latestGrid=sheetGrid("tools");
      latestTools().slice(0,8).forEach(function(tool){
        latestGrid.appendChild(sheetToolCard(tool,(tool.addedAt||tool.updatedAt||"")+" / "+latestLabel(tool),"latest"));
      });
      sheetList.append(latestGrid);
      sheetList.appendChild(
        sheetTitleNode("웹도구 검색","이름이나 용도로 직접 찾아보세요.")
      );
      appendSheetSearch(sheetList);
    }else{
      sheetTitle.textContent="원하는 웹도구를 직접 찾아보세요";
      if(sheetSubtitle)sheetSubtitle.textContent="카테고리 또는 도구 이름으로 바로 찾을 수 있어요.";

      sheetList.appendChild(sheetTitleNode("카테고리로 찾기","원하는 종류를 누르세요."));

      var categoryGrid=sheetGrid("categories");
      categories.forEach(function(category){
        var count=directoryTools().filter(function(tool){return tool.category===category.id;}).length;
        categoryGrid.appendChild(sheetCategoryCard(category,count));
      });
      sheetList.appendChild(categoryGrid);

      appendPopularSheetTools(sheetList,6);

      sheetList.appendChild(sheetTitleNode("웹도구 검색","이름이나 용도로 직접 찾아보세요."));
      appendSheetSearch(sheetList);
    }
    showLayer(sheetOverlay);
    var close=sheetOverlay.querySelector("[data-hm-tools-sheet-close]");
    if(close&&type!=="search")close.focus();
  }

  document.querySelector("[data-hm-tools-share]").addEventListener("click",openShare);
  document.querySelector("[data-hm-tools-share-close]").addEventListener("click",closeShare);
  shareOverlay.addEventListener("click",function(event){if(event.target===shareOverlay)closeShare();});
  shareOverlay.querySelectorAll("[data-share-action]").forEach(function(button){
    button.addEventListener("click",function(){handleShare(button.dataset.shareAction);});
  });
  document.querySelector("[data-hm-tools-sheet-close]").addEventListener("click",function(){hideLayer(sheetOverlay);});
  sheetOverlay.addEventListener("click",function(event){if(event.target===sheetOverlay)hideLayer(sheetOverlay);});
  bottomNav.addEventListener("click",function(event){
    var button=event.target.closest("[data-hm-tools-nav]");
    if(!button)return;
    var action=button.dataset.hmToolsNav;
    if(action==="home"){window.location.href=data.site.homeUrl;return;}
    if(action==="search"){openSheet("search");return;}
    if(action==="recent"){openSheet("recent");return;}
    if(action==="latest"){openSheet("latest");return;}
    if(action==="categories"){openSheet("categories");}
  });
  document.addEventListener("keydown",function(event){
    if(event.key!=="Escape")return;
    if(shareOverlay.classList.contains("is-open"))closeShare();
    if(sheetOverlay.classList.contains("is-open"))hideLayer(sheetOverlay);
  });

  var appRoot=document.getElementById("healingMartCalculatorApp");
  var bottomBoundary=document.querySelector("[data-hm-tools-bottom-boundary]");
  var bottomNavFrame=0;
  function updateBottomNavVisibility(){
    bottomNavFrame=0;
    if(!appRoot||!bottomBoundary||!bottomNav)return;
    var rootRect=appRoot.getBoundingClientRect();
    var boundaryRect=bottomBoundary.getBoundingClientRect();
    var inside=rootRect.top<window.innerHeight-30&&rootRect.bottom>100;
    var reachedEnd=boundaryRect.top<=window.innerHeight-6;
    var documentHeight=Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0);
    var nearDocumentEnd=window.scrollY+window.innerHeight>=documentHeight-24;
    var show=inside&&!reachedEnd&&!nearDocumentEnd;
    bottomNav.classList.toggle("hm-bottom-nav-outside",!show);
    bottomNav.setAttribute("aria-hidden",show?"false":"true");
  }
  function queueBottomNavVisibility(){
    if(bottomNavFrame)return;
    bottomNavFrame=window.requestAnimationFrame(updateBottomNavVisibility);
  }
  window.addEventListener("scroll",queueBottomNavVisibility,{passive:true});
  window.addEventListener("resize",queueBottomNavVisibility);
  queueBottomNavVisibility();

  function showToast(message){
    toast.textContent=message;
    toast.classList.add("is-show");
    window.setTimeout(function(){toast.classList.remove("is-show");},1800);
  }

  function updateSearchPlaceholder(){
    input.placeholder=window.innerWidth<=760
      ?"예: 대출 이자, 평수, PDF JPG"
      :"예: 대출 이자, 디데이, 평수, PDF JPG, 글자수";
  }
  updateSearchPlaceholder();
  window.addEventListener("resize",updateSearchPlaceholder);

  rebuildLookup();
  renderUpdates();
  renderPersonal();
  renderPopular();
  renderSearched();
  renderLatest();
  renderCategories();
  renderAll();
  startUpdateTicker();
  restartPopular();
  loadPublicManifests();
  if("requestIdleCallback" in window){
    window.requestIdleCallback(function(){ensureUnifiedCatalog().then(fetchRankings);},{timeout:1800});
  }else{
    window.setTimeout(function(){ensureUnifiedCatalog().then(fetchRankings);},700);
  }

  /* AutoTOC는 문서 상단의 독립 차단기가 처리합니다. */

  var params=new URLSearchParams(window.location.search);
  var query=params.get("q");
  if(query){input.value=query;form.classList.add("has-value");renderSearch(query);}
})(window,document);
