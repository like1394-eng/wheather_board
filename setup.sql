-- setup.sql : Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run (한 번만 실행)

-- 1) 표 만들기 (지역 · 구분 값 규칙은 DB가 직접 막음)
create table if not exists wx_tasks (
  id         bigint generated always as identity primary key,
  title      text not null check (length(trim(title)) between 1 and 50),
  region     text not null check (region in ('세종', '대전', '태안', '보령')),
  kind       text not null check (kind in ('야외', '고소', '실내')),
  owner      text not null check (length(trim(owner)) between 1 and 20),
  created_at timestamptz not null default now()
);

-- 2) 공개용 키(anon)는 읽기 · 추가만 가능, 수정 · 삭제는 막음
alter table wx_tasks enable row level security;

create policy "anon can read wx_tasks"
  on wx_tasks for select to anon using (true);

create policy "anon can insert wx_tasks"
  on wx_tasks for insert to anon with check (true);

-- 3) 처음 보이는 가상 일정 6건
insert into wx_tasks (title, region, kind, owner) values
  ('다중이용시설 안전점검', '세종', '야외', '김안전'),
  ('시민 안전체험 행사 운영', '보령', '야외', '이행사'),
  ('옥상 태양광 설비 점검', '태안', '고소', '박설비'),
  ('하천 수위계 확인', '대전', '야외', '최현장'),
  ('청사 외벽 간판 보수', '세종', '고소', '정시설'),
  ('비상연락 훈련', '대전', '실내', '한상황');
