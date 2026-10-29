// 경기장: 공식 안내 페이지에서 이름과 주소를 확인한 서울 풋살장 (출처는 README.md 참고)
export const STADIUM_SEED = [
  { name: '서울월드컵경기장 풋살구장', district: '마포구', address: '서울특별시 마포구 월드컵로 240' },
  { name: '고척스카이돔 야외 풋살구장', district: '구로구', address: '서울특별시 구로구 경인로 430' },
  { name: '잠실종합운동장 풋살경기장', district: '송파구', address: '서울특별시 송파구 올림픽로 25' },
  { name: '불암산스포츠타운 풋살장', district: '노원구', address: '서울특별시 노원구 중계로 36' },
  { name: '초안산스포츠타운 풋살장', district: '노원구', address: '서울특별시 노원구 마들로5가길 113' },
  { name: '응봉풋살장', district: '성동구', address: '서울특별시 성동구 응봉동 240-1' },
  { name: '강서 KBS 스포츠월드', district: '강서구', address: '서울특별시 강서구 공항대로 376' },
  { name: '화곡 스트리트 풋살파크', district: '강서구', address: '서울특별시 강서구 화곡로 142' },
  { name: '신정FC 풋살장', district: '강서구', address: '서울특별시 강서구 화곡동 산 199' },
  { name: '영등포 더에프필드', district: '영등포구', address: '서울특별시 영등포구 선유로 138' },
  { name: '송파 천마 풋살파크', district: '송파구', address: '서울특별시 송파구 성내천로29길 31' },
  { name: '잠실 랩스풋볼', district: '송파구', address: '서울특별시 송파구 올림픽로8길 21' },
  { name: '서경대 풋살파크', district: '성북구', address: '서울특별시 성북구 서경로 118 수인관' },
];

// 모집글·작성자·연락 방법은 모두 가상 데이터. 날짜는 서버를 켠 날 기준으로 며칠 뒤인지로 정한다
export const POST_SEED = [
  { stadium: '서울월드컵경기장 풋살구장', title: '이번 주 토요일 아침 풋살, 6명 모집', daysFromNow: 3, time: '09:00', capacity: 6, author: '민준(가상)', contact: '오픈채팅 open.kakao.com/o/demo001 (가상)', level: '상관없음', fee: 5000, applicants: 6, description: '이사 온 지 얼마 안 된 분도 편하게 오세요. 끝나고 같이 커피 마셔요.' },
  { stadium: '잠실종합운동장 풋살경기장', title: '평일 저녁 6:6 소셜 매치', daysFromNow: 2, time: '20:00', capacity: 12, author: '서연(가상)', contact: '오픈채팅 open.kakao.com/o/demo002 (가상)', level: '중급', fee: 7000, applicants: 9, description: '조끼와 공은 준비되어 있어요. 풋살화만 챙겨 오세요.' },
  { stadium: '불암산스포츠타운 풋살장', title: '노원 초보 환영 풋살 모임', daysFromNow: 5, time: '10:00', capacity: 8, author: '지호(가상)', contact: '오픈채팅 open.kakao.com/o/demo003 (가상)', level: '입문', fee: 3000, applicants: 3, description: '처음 하시는 분 위주로 천천히 합니다.' },
  { stadium: '고척스카이돔 야외 풋살구장', title: '일요일 오후 친선 경기 상대팀 구해요', daysFromNow: 6, time: '15:00', capacity: 6, author: '다은(가상)', contact: '오픈채팅 open.kakao.com/o/demo004 (가상)', level: '중급', fee: 0, applicants: 6, description: '저희 팀은 5명이고 1명이 더 필요해요.' },
  { stadium: '강서 KBS 스포츠월드', title: '금요일 밤 풋살 같이 뛰어요', daysFromNow: 4, time: '21:00', capacity: 10, author: '현우(가상)', contact: '오픈채팅 open.kakao.com/o/demo005 (가상)', level: '상급', fee: 8000, applicants: 4, description: '빠른 템포로 뛰는 경기입니다. 체력에 자신 있는 분 환영.' },
  { stadium: '응봉풋살장', title: '성동 아침 조기 풋살', daysFromNow: 7, time: '07:00', capacity: 8, author: '수아(가상)', contact: '오픈채팅 open.kakao.com/o/demo006 (가상)', level: '상관없음', fee: 2000, applicants: 0, description: '출근 전에 가볍게 땀 빼요.' },
  { stadium: '송파 천마 풋살파크', title: '송파 토요일 오후 매치 (여자 환영)', daysFromNow: 10, time: '14:00', capacity: 10, author: '하린(가상)', contact: '오픈채팅 open.kakao.com/o/demo007 (가상)', level: '입문', fee: 6000, applicants: 7, description: '성별 상관없이 즐겁게 하는 모임입니다.' },
  { stadium: '서경대 풋살파크', title: '성북 저녁 풋살 3경기', daysFromNow: 8, time: '19:30', capacity: 12, author: '태오(가상)', contact: '오픈채팅 open.kakao.com/o/demo008 (가상)', level: '중급', fee: 6000, applicants: 2, description: '3경기 연속으로 합니다. 물은 챙겨 오세요.' },
  { stadium: '영등포 더에프필드', title: '영등포 퇴근 후 풋살', daysFromNow: 12, time: '20:30', capacity: 10, author: '유진(가상)', contact: '오픈채팅 open.kakao.com/o/demo009 (가상)', level: '상관없음', fee: 7000, applicants: 1, description: '퇴근하고 가볍게 한 판 해요.' },
  { stadium: '서울월드컵경기장 풋살구장', title: '마포 일요일 아침 풋살', daysFromNow: 13, time: '08:30', capacity: 6, author: '준서(가상)', contact: '오픈채팅 open.kakao.com/o/demo010 (가상)', level: '입문', fee: 4000, applicants: 3, description: '지난주에 이어 두 번째 모임이에요. 새로 오시는 분 환영합니다.' },
  { stadium: '응봉풋살장', title: '지난 주말 성동 풋살 (이미 끝난 경기)', daysFromNow: -2, time: '10:00', capacity: 8, author: '도현(가상)', contact: '오픈채팅 open.kakao.com/o/demo011 (가상)', level: '중급', fee: 3000, applicants: 5, description: '경기 시작 후에는 신청·취소가 막히는 규칙을 보여 주기 위한 예시 글입니다.' },
];

export const APPLICANT_NAMES = ['민준','서연','지호','다은','현우','수아','하린','태오','유진','준서','예린','도윤'];
