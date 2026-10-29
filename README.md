# 서울 풋살 매칭 - 백엔드 (NestJS + PostgreSQL) · Level 2

서울 풋살장별 모집글에 참가 신청·취소를 하고, 정원·중복·신청 기간 규칙을 서버가 지키는 서비스입니다.
기획 내용은 [기획서.md](기획서.md)를 보세요. 화면은 `futsal-match-level2-frontend` 저장소입니다.

## ⏳ 무료 서버 안내
이 백엔드는 Render **무료 서버**에 올라가 있어서, 한동안 접속이 없으면 잠들어 있다가 **첫 접속이 30초~1분 정도 느릴 수 있습니다.** 화면이 비어 있거나 오류가 보이면 잠시 기다렸다가 새로고침해 주세요. 먼저 `/health` 주소를 열어 깨워 두면 편합니다.

## 서버가 지키는 규칙 (신청)
| 규칙 | 거절할 때 알려 주는 말 |
|---|---|
| 신청 기간: 경기 시작 후에는 신청·취소 불가 | "경기가 이미 시작되었거나 끝나서 신청할 수 없어요." |
| 중복 신청 금지: 같은 글에 같은 연락 방법은 한 번만 | "이미 이 모집글에 신청하셨어요." |
| 정원: 모집 인원이 차면 신청 불가 | "정원이 다 찼어요. 다른 모집글을 찾아보세요." |

마지막 한 자리를 여러 명이 동시에 눌러도 한 명만 성공하도록, 글 한 줄을 잠그고 확인과 저장을 한 묶음으로 처리합니다.

## API
| API | 역할 |
|---|---|
| `GET /health` | 서버와 DB 연결 상태 |
| `GET /posts` | 모집글 목록. 검색 `q`, 구 `district`, 실력 `skill_level`, 상태 `status`(open·full·ended). 신청 수·남은 자리 포함 |
| `GET /posts/:id` | 모집글 상세 |
| `POST /posts` · `PATCH /posts/:id` · `DELETE /posts/:id` | 모집글 등록·수정·삭제 (4자리 글 비밀번호) |
| `GET /posts/:id/applications` | 신청 명단 (이름만) |
| `POST /posts/:id/applications` | 참가 신청 (이름, 연락 방법, 취소용 4자리 비밀번호) |
| `DELETE /applications/:id` | 신청 취소 (본문 `password`) |
| `GET /stats` | 현황 숫자 3개 (오늘 신청 수, 신청 가능한 모집글 수, 남은 자리 합계) |
| `POST /admin/reset-demo` | 가상 데이터 다시 채우기 (헤더 `x-admin-password`) |
| `GET /stadiums` · `POST/PATCH/DELETE /stadiums` | 경기장 조회 / 등록·수정·삭제 (관리자 비밀번호) |

필수 칸·숫자·날짜 등의 규칙은 모두 백엔드가 검사하고 칸별 쉬운 한국어 오류(`errors`)를 돌려줍니다.

## 내 컴퓨터에서 실행
```bash
npm install
cp .env.example .env   # .env에 DB 주소와 관리자 비밀번호를 채운다
npm run start
```
서버 주소: http://localhost:3001 · 상태 확인: http://localhost:3001/health
처음 켜면 테이블 3개(`stadiums`, `posts`, `applications`)가 만들어지고, 비어 있으면 경기장 13곳과 가상 모집글·신청이 들어갑니다.

## Render에 올리기
1. **New → Web Service**로 이 저장소를 연결합니다.
2. 아래처럼 입력합니다.

| 항목 | 값 |
|---|---|
| Language | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |
| Instance Type | Free |

3. **Environment**에 아래 값을 넣습니다. (값은 저장소에 올라가 있지 않습니다.)

| 이름 | 뜻 |
|---|---|
| `DATABASE_URL` | PostgreSQL 주소 (Render DB의 Internal 주소 권장) |
| `DB_SCHEMA` | 같은 DB를 다른 앱과 나눠 쓸 때 이 앱의 테이블을 담을 구역 이름. 이 앱은 `level2` |
| `ADMIN_PASSWORD` | 경기장 관리와 가상 데이터 다시 채우기용 관리자 비밀번호 |
| `FRONTEND_URL` | 접속을 허용할 프론트엔드(Vercel) 주소. 끝에 `/` 없이 |
| `NODE_VERSION` | `22` |

`PORT`는 Render가 알아서 넣어 줍니다.

4. 배포가 끝나면 `/health`를 열어 `"database":"연결됨"`을 확인합니다.

## 경기장 데이터 출처
이름과 주소를 공식·예약 안내 페이지(서울시설공단, 서울시 우리동네 체육시설, 노원구시설관리공단, 성동구도시관리공단, 플랩풋볼 구장 정보)에서 확인했습니다. 시설 상황은 바뀔 수 있으니 경기장 화면에서 수정할 수 있습니다.
모집글·신청자·연락처는 모두 가상입니다. 가상 글과 신청의 비밀번호는 `1234`입니다.
