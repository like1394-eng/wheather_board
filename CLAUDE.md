# CLAUDE.md – 현장 일정 날씨판 작업 규칙

## 프로젝트 개요
- 교육용 프로토타입이다. 무엇을 만들지는 PRD.md를 따른다.
- PRD.md에 없는 기능은 먼저 제안하고, 내가 승인한 뒤에만 구현한다.

## 기술 스택 (변경 금지)
- HTML + CSS + 순수 JavaScript만 사용한다. (React 등 프레임워크, 빌드 도구 사용 금지)
- 외부 스크립트는 supabase-js 하나만 허용한다. (버전을 고정해서 불러온다)
- 서버 함수는 api/ 폴더에만 둔다. (Vercel 함수, 외부 패키지 설치 금지, 키는 Vercel 환경변수로만 읽는다)
- index.html 을 더블클릭해서 열 수 있어야 한다.

## 폴더 구조
- index.html : 화면 구조
- style.css  : 디자인
- logic.js   : 판단 규칙만 (화면을 다루는 코드 금지)
- app.js     : 화면 동작 (목록 그리기, 일정 추가)
- config.js  : Supabase 주소 · 공개용(anon) 키 두 줄만
- setup.sql  : Supabase 표(wx_tasks) 만들기 (내가 SQL Editor에서 실행)
- 데이터는 Supabase 표 wx_tasks 에 둔다 (코드 안에 데이터를 직접 쓰지 않는다)
- PRD.md · CLAUDE.md · README.md : 문서

## 작업 방식
1. 코드를 고치기 전에 계획(수정할 파일과 이유)을 먼저 보여 주고 승인을 받는다.
2. 한 번에 한 가지만 고친다.
3. 끝나면 바꾼 파일, 내가 확인할 방법(T-번호), 남은 문제를 보고한다.

## 보안 · 데이터 규칙
- 가상 데이터만 사용한다. 실제 이름 · 연락처 · 기관 내부 자료를 넣지 않는다.
- 사용자가 입력한 글자는 textContent 로 표시한다.
- 비밀 키는 코드 · 채팅 · GitHub 에 넣지 않는다. (Supabase service_role 키 금지, config.js 에는 공개용 anon 키만)
- 지역 · 구분 값 규칙은 화면과 DB(setup.sql 의 CHECK)에서 모두 막는다.
