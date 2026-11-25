import type { GrammarLesson } from '../types/learning';

/**
 * Comprehensive TOPIK 1-6级 official grammar syllabus (25 additional core lessons
 * combined with the 5 in seedData.ts = 30 full official TOPIK grammar points).
 */
export const EXTRA_TOPIK_GRAMMAR_LESSONS: GrammarLesson[] = [
  // ================= TOPIK 1级 =================
  {
    id: 'g-eunneun-iga',
    pattern: '-은/는 vs -이/가',
    titleZh: '主题助词与主格助词核心区别',
    level: 'TOPIK 1级',
    summary: '中国学习者最容易混淆的韩语基础助词：은/는 强调“话题/对比/已知信息”，이/가 强调“新信息/具体主语/状态对象”。',
    conjugationRules: [
      { condition: '前字有收音', formula: '名词 + 은 / 이', example: '학생은 / 이름이' },
      { condition: '前字无收音', formula: '名词 + 는 / 가', example: '저는 / 날씨가' },
    ],
    nuanceComparison: '自我介绍说“저는 중국 사람이에요（说到我呢，是中国人）”；回答“谁来了？”必须用“민수가 왔어요（是敏洙来了）”。',
    examples: [
      {
        korean: '커피는 좋아하지만 녹차는 안 마셔요.',
        spokenPronunciation: '[커피는 좋아하지만 녹차는 안 마셔요]',
        chinese: '咖啡我喜欢，但绿茶不喝。（对比用 은/는）',
      },
      {
        korean: '오늘 날씨가 정말 따뜻해요.',
        spokenPronunciation: '[오늘 날씨가 정말 따뜨태요]',
        chinese: '今天天气真的很暖和。（客观状态主语用 이/가）',
      },
    ],
    challengePromptZh: '造句：我喜欢韩国料理，但是不太能吃辣的菜。（练习用 은/는 做对比）',
    hintWords: [
      { kr: '한국 음식', zh: '韩国料理' },
      { kr: '좋아하다', zh: '喜欢' },
      { kr: '매운 음식', zh: '辣的食物' },
    ],
    sampleAnswerKr: '저는 한국 음식은 좋아하지만 매운 음식은 잘 못 먹어요.',
  },
  {
    id: 'g-e-eseo',
    pattern: '-에 vs -에서',
    titleZh: '静态位置/目的地 vs 动作发生场所',
    level: 'TOPIK 1级',
    summary: '在韩国语中，“在某地存在或去往某地”用 -에，“在某地做某项动作或从某地出发”必须用 -에서。',
    conjugationRules: [
      { condition: '存在/去向（있다/없다/가다/오다）', formula: '场所名词 + 에', example: '집에 있어요 / 서울에 가요' },
      { condition: '发生动作（먹다/공부하다/일하다）', formula: '场所名词 + 에서', example: '카페에서 공부해요' },
    ],
    nuanceComparison: '“도서관에 있어요（人在图书馆）” vs “도서관에서 책을 읽어요（在图书馆看书）”，切勿把动作场所误用成 에。',
    examples: [
      {
        korean: '지금 회사에 있는데 곧 집에 갈 거예요.',
        spokenPronunciation: '[지금 회사에 인는데 곧 지베 갈 꺼예요]',
        chinese: '我现在在公司，马上就要回家了。',
      },
      {
        korean: '어제 명동에서 친구를 만나서 밥을 먹었어요.',
        spokenPronunciation: '[어제 명동에서 친구를 만나서 바블 머거써요]',
        chinese: '昨天在明洞见了朋友还吃了饭。',
      },
    ],
    challengePromptZh: '造句：我周末常在安静的咖啡馆学习韩语。',
    hintWords: [
      { kr: '주말에', zh: '在周末' },
      { kr: '조용한 카페', zh: '安静的咖啡馆' },
      { kr: '공부하다', zh: '学习' },
    ],
    sampleAnswerKr: '저는 주말에 자주 조용한 카페에서 한국어를 공부해요.',
  },
  {
    id: 'g-a-eoyo',
    pattern: '-아/어요',
    titleZh: '日常最常用的非格式体敬语终结词尾',
    level: 'TOPIK 1级',
    summary: '首尔日常生活使用率高达 85% 的礼貌敬语形式，根据词干最后一个元音决定接 아요、어요 还是 해요。',
    conjugationRules: [
      { condition: '词干末元音为 ㅏ/ㅗ', formula: '词干 + 아요', example: '가다 → 가요, 보다 → 봐요' },
      { condition: '词干末元音为其他元音', formula: '词干 + 어요', example: '먹다 → 먹어요, 마시다 → 마셔요' },
      { condition: '하다 类动词/形容词', formula: '하다 → 해요', example: '공부하다 → 공부해요' },
    ],
    nuanceComparison: '陈述句句尾平降，疑问句只需在句尾微微上扬语调（밥 먹었어요?），不用额外改词尾！',
    examples: [
      {
        korean: '매일 아침 출근하기 전에 커피를 마셔요.',
        spokenPronunciation: '[매일 아침 출근하기 저네 커피를 마셔요]',
        chinese: '每天早上上班前都喝咖啡。',
      },
      {
        korean: '오늘 저녁에 시간 괜찮아요?',
        spokenPronunciation: '[오늘 저녀게 시간 괜차나요]',
        chinese: '今天晚上有空吗？',
      },
    ],
    challengePromptZh: '造句：我每天晚上看韩剧练习听力。',
    hintWords: [
      { kr: '매일 밤', zh: '每天晚上' },
      { kr: '한국 드라마', zh: '韩剧' },
      { kr: '듣기 연습하다', zh: '练习听力' },
    ],
    sampleAnswerKr: '저는 매일 밤 한국 드라마를 보면서 듣기를 연습해요.',
  },
  {
    id: 'g-geoyeyo',
    pattern: '-(으)ㄹ 거예요',
    titleZh: '表达将来计划与主观推测',
    level: 'TOPIK 1级',
    summary: '接在动词或形容词词干后：主语是第一人称时表示“打算/将要做某事”，主语是第三人称或天气时表示“大概会……”。',
    conjugationRules: [
      { condition: '词干有收音（ㄹ 除外）', formula: '词干 + 을 거예요', example: '먹다 → 먹을 거예요' },
      { condition: '词干无收音或 ㄹ 收音', formula: '词干 + ㄹ 거예요', example: '가다 → 갈 거예요, 살다 → 살 거예요' },
    ],
    nuanceComparison: '注意实际发音中 거예요 常发生紧音化读作 [꺼예요]，口语也常简说为 -(으)ㄹ 거야（平语）。',
    examples: [
      {
        korean: '다음 주에 친구들과 부산으로 여행을 갈 거예요.',
        spokenPronunciation: '[다음 주에 친구들과 부사느로 여행을 갈 꺼예요]',
        chinese: '下周打算和朋友们去釜山旅行。',
      },
      {
        korean: '내일은 오늘보다 날씨가 더 추울 거예요.',
        spokenPronunciation: '[내이른 오늘보다 날씨가 더 추울 꺼예요]',
        chinese: '明天天气大概会比今天更冷。',
      },
    ],
    challengePromptZh: '造句：今年秋天我打算参加 TOPIK 考试。',
    hintWords: [
      { kr: '올해 가을', zh: '今年秋天' },
      { kr: '토픽 시험', zh: 'TOPIK 考试' },
      { kr: '보다', zh: '参加（考试）' },
    ],
    sampleAnswerKr: '올해 가을에 토픽 시험을 볼 거예요.',
  },
  {
    id: 'g-gosipda',
    pattern: '-고 싶다',
    titleZh: '表达愿望与想法（“想要做……”）',
    level: 'TOPIK 1级',
    summary: '接在动词词干后，表达说话人自己的愿望；当主语是第三人称时，必须变为动词形态 -고 싶어하다。',
    conjugationRules: [
      { condition: '第一/二人称问句', formula: '动词词干 + 고 싶어요', example: '가고 싶어요, 배우고 싶어요' },
      { condition: '第三人称陈述', formula: '动词词干 + 고 싶어해요', example: '친구가 한국에 가고 싶어해요' },
    ],
    nuanceComparison: 'TOPIK 1级必考陷阱：第三人称（如 동생이）不能直接用 -고 싶어요，必须用 -고 싶어해요。',
    examples: [
      {
        korean: '한국어를 유창하게 말하고 싶어요.',
        spokenPronunciation: '[한구거를 유창하게 말하고 시퍼요]',
        chinese: '我想流利地说韩语。',
      },
      {
        korean: '동생은 여름방학에 제주도에 가고 싶어해요.',
        spokenPronunciation: '[동생은 여름방하게 제주도에 가고 시퍼해요]',
        chinese: '弟弟暑假想去济州岛。',
      },
    ],
    challengePromptZh: '造句：我想去首尔品尝地道烤肉。',
    hintWords: [
      { kr: '서울에 가다', zh: '去首尔' },
      { kr: '맛있는 삼겹살', zh: '美味五花肉' },
      { kr: '먹다', zh: '吃' },
    ],
    sampleAnswerKr: '서울에 가서 맛있는 삼겹살을 먹고 싶어요.',
  },
  {
    id: 'g-juseyo',
    pattern: '-아/어 주세요',
    titleZh: '礼貌请求对方为自己做某事',
    level: 'TOPIK 1级',
    summary: '点餐、问路、求助时使用频率最高的礼貌请求句型，比单纯命令 -(으)세요 更柔和、更地道。',
    conjugationRules: [
      { condition: '动词词干 ㅏ/ㅗ', formula: '词干 + 아 주세요', example: '찾아 주세요, 받아 주세요' },
      { condition: '其他元音 / 하다', formula: '词干 + 어 주세요 / 해 주세요', example: '읽어 주세요, 설명해 주세요' },
    ],
    nuanceComparison: '请求陌生人或店员时，前面加 “좀” 或换成更委婉的 “-아/어 주실 수 있어요?” 听起来极有教养。',
    examples: [
      {
        korean: '조금만 천천히 말해 주세요.',
        spokenPronunciation: '[조금만 천천히 말해 주세요]',
        chinese: '请稍微说慢一点。',
      },
      {
        korean: '이 단어 뜻을 다시 한번 설명해 주세요.',
        spokenPronunciation: '[이 단어 뜨슬 다시 한번 설명해 주세요]',
        chinese: '请再帮我解释一遍这个单词的意思。',
      },
    ],
    challengePromptZh: '造句：请帮我把这杯冰美式少放一点冰。',
    hintWords: [
      { kr: '얼음', zh: '冰块' },
      { kr: '적게 넣다', zh: '少放' },
      { kr: '아이스 아메리카노', zh: '冰美式' },
    ],
    sampleAnswerKr: '아이스 아메리카노는 얼음을 조금만 적게 넣어 주세요.',
  },

  // ================= TOPIK 2级 =================
  {
    id: 'g-a-eoseo',
    pattern: '-아/어서',
    titleZh: '自然因果与先后顺承',
    level: 'TOPIK 2级',
    summary: '连接两个分句：既可表示客观自然的原因（“因为……所以……”），也可表示同一主语紧密衔接的先后动作（“做了A然后做B”）。',
    conjugationRules: [
      { condition: '前面不可加过去时 았/었', formula: '词干 + 아서 / 어서 / 해서', example: '늦어서 미안해요（不可说 늦었어서）' },
      { condition: '后句不可用命令/共动句', formula: '后句只能接陈述或疑问', example: '비가 와서 집에 있었어요' },
    ],
    nuanceComparison: 'TOPIK I 核心考点：-아/어서 前不加时态、后不接 -(으)세요 / -(으)ㅂ시다；若后句是命令或建议必须换用 -(으)니까！',
    examples: [
      {
        korean: '어제 너무 피곤해서 일찍 잤어요.',
        spokenPronunciation: '[어제 너무 피곤해서 일찍 짜써요]',
        chinese: '昨天太累了，所以很早就睡了。',
      },
      {
        korean: '백화점에 가서 친구 생일 선물을 샀어요.',
        spokenPronunciation: '[배콰저메 가서 친구 생일 선무를 싸써요]',
        chinese: '去了百货店买了朋友的生日礼物。',
      },
    ],
    challengePromptZh: '造句：因为今天堵车，所以我晚到了十分钟。',
    hintWords: [
      { kr: '길이 막히다', zh: '堵车' },
      { kr: '십 분', zh: '十分钟' },
      { kr: '늦게 도착하다', zh: '晚到' },
    ],
    sampleAnswerKr: '오늘 길이 많이 막혀서 십 분 늦게 도착했어요.',
  },
  {
    id: 'g-eunikka',
    pattern: '-(으)니까',
    titleZh: '主观理由与命令/建议的前提',
    level: 'TOPIK 2级',
    summary: '表示说话人强调的理由或根据，后句可以自由接命令句（-(으)세요）、共动句（-(으)ㅂ시다）和建议句，且前句可带过去时态。',
    conjugationRules: [
      { condition: '有收音（ㄹ 除外）', formula: '词干 + 으니까', example: '먹으니까, 있으니까' },
      { condition: '无收音或 ㄹ 脱落', formula: '词干 + 니까', example: '가니까, 만드니까' },
    ],
    nuanceComparison: '致谢/道歉固定用 -아/어서（도와주셔서 감사합니다），而催促/建议固定用 -(으)니까（추우니까 옷 따뜻하게 입으세요）。',
    examples: [
      {
        korean: '밖이 많이 추우니까 두꺼운 코트를 입으세요.',
        spokenPronunciation: '[바끼 마니 추우니까 두꺼운 코트를 이브세요]',
        chinese: '外面很冷，请穿件厚外套吧。',
      },
      {
        korean: '시간이 없으니까 지하철을 타고 갑시다.',
        spokenPronunciation: '[시가니 업쓰니까 지하처를 타고 갑씨다]',
        chinese: '没时间了，咱们坐地铁去吧。',
      },
    ],
    challengePromptZh: '造句：因为这家店周末人很多，咱们提前预约吧。',
    hintWords: [
      { kr: '주말에 사람이 많다', zh: '周末人多' },
      { kr: '미리 예약하다', zh: '提前预约' },
    ],
    sampleAnswerKr: '이 식당은 주말에 사람이 많으니까 미리 예약합시다.',
  },
  {
    id: 'g-eumyeon',
    pattern: '-(으)면',
    titleZh: '假设条件与习惯前提（“如果……的话”）',
    level: 'TOPIK 2级',
    summary: '表示假设尚未发生的情况，或某个反复出现的条件，常与副词 “만약（如果）” 搭配使用。',
    conjugationRules: [
      { condition: '有收音（ㄹ 除外）', formula: '词干 + 으면', example: '시간이 있으면' },
      { condition: '无收音或 ㄹ 收音', formula: '词干 + 면', example: '날씨가 좋으면, 한국에 살면' },
    ],
    nuanceComparison: '若要表达“要是……就好了”的愿望，可直接构成高频句型 “-(으)면 좋겠다”。',
    examples: [
      {
        korean: '모르는 단어가 나오면 바로 사전을 찾아봐요.',
        spokenPronunciation: '[모르는 단어가 나오면 바로 사저늘 차자봐요]',
        chinese: '如果出现不认识的单词，我就立刻查词典。',
      },
      {
        korean: '이번 시험에 꼭 합격하면 좋겠어요.',
        spokenPronunciation: '[이번 시허메 꼭 합껴카면 조케써요]',
        chinese: '这次考试要是能顺利通过就好了。',
      },
    ],
    challengePromptZh: '造句：如果每天背十个单词，三个月后韩语实力会提高很多。',
    hintWords: [
      { kr: '단어를 외우다', zh: '背单词' },
      { kr: '한국어 실력', zh: '韩语实力' },
      { kr: '늘다', zh: '提高/增长' },
    ],
    sampleAnswerKr: '매일 단어를 열 개씩 외우면 석 달 뒤에 한국어 실력이 많이 늘 거예요.',
  },
  {
    id: 'g-eulsu-itda',
    pattern: '-(으)ㄹ 수 있다/없다',
    titleZh: '能力与可能性（“能够 / 不能”）',
    level: 'TOPIK 2级',
    summary: '表示具备某种技能，或在客观条件下“可以做到/无法做到”，是 TOPIK I & II 口语与阅读的基石句型。',
    conjugationRules: [
      { condition: '有收音（ㄹ 除外）', formula: '词干 + 을 수 있다/없다', example: '읽을 수 있어요' },
      { condition: '无收音或 ㄹ 收音', formula: '词干 + ㄹ 수 있다/없다', example: '말할 수 있어요, 만들 수 있어요' },
    ],
    nuanceComparison: '强调能力不足时，口语里 “못 + 动词”（못 먹어요）与 “-ㄹ 수 없어요” 常互换，但后者更正式、更适合书面或礼貌婉拒。',
    examples: [
      {
        korean: '이제 자막 없이도 간단한 한국어 영상을 이해할 수 있어요.',
        spokenPronunciation: '[이제 자막 업씨도 간단한 한구거 영상을 이해할 쑤 이써요]',
        chinese: '现在没有字幕也能听懂简单的韩语视频了。',
      },
      {
        korean: '갑자기 회의가 생겨서 저녁 약속에 갈 수 없게 됐어요.',
        spokenPronunciation: '[갑짜기 회의가 생겨서 저녁 약쏘게 갈 쑤 업께 돼써요]',
        chinese: '突然多了个会议，晚上的约会去不了了。',
      },
    ],
    challengePromptZh: '造句：在这里可以用手机扫码结账吗？',
    hintWords: [
      { kr: '휴대폰으로', zh: '用手机' },
      { kr: '결제하다', zh: '结账/支付' },
    ],
    sampleAnswerKr: '여기에서 휴대폰으로 결제할 수 있어요?',
  },
  {
    id: 'g-a-eoya-hada',
    pattern: '-아/어야 하다 (되다)',
    titleZh: '义务与必要性（“必须 / 应该”）',
    level: 'TOPIK 2级',
    summary: '表达必须履行的义务、规则或为了达成目标而不得不做的事情；口语中常用 -아/어야 돼요，书面常用 -아/어야 합니다。',
    conjugationRules: [
      { condition: '词干 ㅏ/ㅗ', formula: '词干 + 아야 하다/되다', example: '가야 돼요, 알아야 해요' },
      { condition: '其他元音 / 하다', formula: '词干 + 어야 / 해야 하다', example: '연습해야 돼요' },
    ],
    nuanceComparison: '否定“不必做”不是用 안，而是用 “-지 않아도 되다（不用……也行）”；禁止“绝对不可以做”用 “-(으)면 안 되다”。',
    examples: [
      {
        korean: '내일 아침 일찍 출발해야 해서 오늘은 빨리 자야 돼요.',
        spokenPronunciation: '[내일 아침 일찍 출발해야 해서 오느른 빨리 자야 돼요]',
        chinese: '因为明天一早得出发，今天必须早点睡。',
      },
      {
        korean: '신청 마감일 전에 서류를 제출해야 합니다.',
        spokenPronunciation: '[신청 마가밀 저네 서류를 제출해야 함니다]',
        chinese: '必须在报名截止日前提交材料。',
      },
    ],
    challengePromptZh: '造句：想要通过 TOPIK 高级，必须每天坚持阅读新闻文章。',
    hintWords: [
      { kr: '토픽 고급', zh: 'TOPIK 高级' },
      { kr: '합격하려면', zh: '要想通过' },
      { kr: '뉴스 기사', zh: '新闻文章' },
    ],
    sampleAnswerKr: '토픽 고급에 합격하려면 매일 꾸준히 뉴스 기사를 읽어야 해요.',
  },
  {
    id: 'g-gittaemune',
    pattern: '-기 때문에 / N 때문에',
    titleZh: '明确客观原因（“因为……”）',
    level: 'TOPIK 2级',
    summary: '比 -아/어서 更明确强调因果关系，既可直接接名词（비 때문에），也可接动词/形容词词干（-기 때문에），TOPIK 写作与阅读核心高频。',
    conjugationRules: [
      { condition: '名词后', formula: '名词 + 때문에', example: '감기 때문에, 날씨 때문에' },
      { condition: '动词/形容词后', formula: '词干 + 기 때문에', example: '바쁘기 때문에, 중요하기 때문에' },
    ],
    nuanceComparison: '和 -아/어서 一样，-기 때문에 后面通常不接命令句或共动句，但前面可以带过去时（-았/었기 때문에）！',
    examples: [
      {
        korean: '갑자기 비가 많이 왔기 때문에 야외 행사가 취소됐어요.',
        spokenPronunciation: '[갑짜기 비가 마니 와끼 때무네 야외 행사가 취소돼써요]',
        chinese: '因为突然下了大雨，户外活动取消了。',
      },
      {
        korean: '꾸준히 복습했기 때문에 시험에서 좋은 점수를 받았어요.',
        spokenPronunciation: '[꾸준히 복쓰패끼 때무네 시허메서 조은 점수를 바다써요]',
        chinese: '因为持续复习了，所以在考试中取得了好成绩。',
      },
    ],
    challengePromptZh: '造句：因为公司离家太远，所以每天通勤要花一个小时。',
    hintWords: [
      { kr: '집에서 멀다', zh: '离家远' },
      { kr: '출퇴근 시간', zh: '通勤时间' },
      { kr: '한 시간 걸리다', zh: '花一小时' },
    ],
    sampleAnswerKr: '회사가 집에서 너무 멀기 때문에 매일 출퇴근하는 데 한 시간 걸려요.',
  },
  {
    id: 'g-jiman',
    pattern: '-지만',
    titleZh: '转折对比（“虽然……但是……”）',
    level: 'TOPIK 2级',
    summary: '直接接在任何动词、形容词或时态词尾后面，表示前后两个事实相互转折或形成对比，没有复杂收音变化。',
    conjugationRules: [
      { condition: '所有动词/形容词', formula: '词干 + 지만', example: '비싸지만, 어렵지만, 먹었지만' },
      { condition: '名词 + 이다', formula: '名词 + (이)지만', example: '초보자이지만 / 학생이지만' },
    ],
    nuanceComparison: '日常口语里在引入柔和铺垫时常用 -(으)ㄴ/는데，而直接表达强转折（价格贵但好吃）用 -지만 最利落。',
    examples: [
      {
        korean: '한국어 발음 규칙이 처음에는 어렵지만 익숙해지면 재미있어요.',
        spokenPronunciation: '[한구거 바름 규치기 처으메는 어렵찌만 익쑤캐지면 재미이써요]',
        chinese: '韩语发音规则刚开始很难，但熟悉之后很有趣。',
      },
      {
        korean: '이 카페는 조금 멀지만 분위기가 좋아서 자주 와요.',
        spokenPronunciation: '[이 카페는 조금 멀지만 부뉘기가 조아서 자주 와요]',
        chinese: '这家咖啡馆虽然有点远，但氛围很好所以我常来。',
      },
    ],
    challengePromptZh: '造句：虽然今天工作很忙，但还是抽出十分钟背了单词。',
    hintWords: [
      { kr: '일이 바쁘다', zh: '工作忙' },
      { kr: '시간을 내다', zh: '抽出时间' },
      { kr: '단어를 외우다', zh: '背单词' },
    ],
    sampleAnswerKr: '오늘 일이 많이 바빴지만 십 분 시간을 내서 단어를 외웠어요.',
  },

  // ================= TOPIK 3-4级 =================
  {
    id: 'g-neunde',
    pattern: '-(으)ㄴ/는데',
    titleZh: '背景铺垫、委婉转折与话题引入',
    level: 'TOPIK 3-4级',
    summary: '韩国人日常对话出场率第一的万能连接词尾：先给出背景情况，再引出后文的提问、请求、建议或意外转折。',
    conjugationRules: [
      { condition: '动词现在时 / 있다·없다', formula: '词干 + 는데', example: '가는데, 있는데, 먹는데' },
      { condition: '形容词现在时', formula: '词干 + 은데(有收音) / ㄴ데(无收音)', example: '작은데, 예쁜데, 좋은데' },
      { condition: '过去时 / 名词', formula: '았/었는데 / 名词+(이)ㄴ데', example: '봤는데, 학생인데' },
    ],
    nuanceComparison: '直接用于句尾（-는데요 / -ㄴ데）可表达委婉拒绝、轻微惊讶或等待对方接话，极其地道！',
    examples: [
      {
        korean: '혹시 성수역으로 가려고 하는데 몇 번 출구로 나가야 돼요?',
        spokenPronunciation: '[혹씨 성수여그로 가려고 하는데 몇 뻔 출구로 나가야 돼요]',
        chinese: '请问我正打算去圣水站，应该从几号出口出去呢？',
      },
      {
        korean: '어제 그 영화를 봤는데 생각보다 훨씬 감동적이었어요.',
        spokenPronunciation: '[어제 그 영화를 봔는데 생각뽀다 훨씬 감동저기어써요]',
        chinese: '昨天看了那部电影，比想象中感人得多。',
      },
    ],
    challengePromptZh: '造句：请问这件衣服还有大一号的尺码吗？（用 -는데 先铺垫）',
    hintWords: [
      { kr: '이 옷이 마음에 들다', zh: '喜欢这件衣服' },
      { kr: '한 치수 큰 사이즈', zh: '大一号的尺码' },
    ],
    sampleAnswerKr: '이 옷이 참 마음에 드는데 혹시 한 치수 큰 사이즈가 있어요?',
  },
  {
    id: 'g-neun-pyeonida',
    pattern: '-(으)ㄴ/는 편이다',
    titleZh: '委婉概括倾向（“算是偏……的类型”）',
    level: 'TOPIK 3-4级',
    summary: '表达某事物或个人习惯“总体偏向某一侧”，避免把话说得太绝对，是中级口语与 TOPIK 写作的标志性高分表达。',
    conjugationRules: [
      { condition: '动词现在时', formula: '动词词干 + 는 편이다', example: '자주 먹는 편이에요' },
      { condition: '形容词', formula: '词干 + (으)ㄴ 편이다', example: '조용한 편이에요, 넓은 편이에요' },
    ],
    nuanceComparison: '韩国文化偏爱谦虚柔和表达：说自己“한국어를 잘해요”略显直白，说“조금 하는 편이에요 / 열심히 공부하는 편이에요”立刻像中高级母语者。',
    examples: [
      {
        korean: '저는 평소에도 매운 음식을 꽤 잘 먹는 편이에요.',
        spokenPronunciation: '[저는 평소에도 매운 음시글 꽤 잘 먹는 펴니에요]',
        chinese: '我平时算是挺能吃辣的那种人。',
      },
      {
        korean: '이 동네는 교통이 편리하고 물가도 저렴한 편입니다.',
        spokenPronunciation: '[이 동네는 교통이 편리하고 물까도 저렴한 펴님니다]',
        chinese: '这片街区交通方便，物价也算是比较实惠的。',
      },
    ],
    challengePromptZh: '造句：我平时算是比较喜欢安静看书的性格。',
    hintWords: [
      { kr: '평소에', zh: '平时' },
      { kr: '조용히 책을 읽다', zh: '安静地看书' },
    ],
    sampleAnswerKr: '저는 평소에 집에서 조용히 책을 읽는 것을 좋아하는 편이에요.',
  },
  {
    id: 'g-gi-maryeonida',
    pattern: '-기 마련이다',
    titleZh: '自然规律与必然结果（“必然会 / 难免会”）',
    level: 'TOPIK 3-4级',
    summary: '用于阐述客观规律、生活哲理或理所当然的趋势，TOPIK II 中级阅读与大作文论证段极高频。',
    conjugationRules: [
      { condition: '动词/形容词词干', formula: '词干 + 기 마련이다', example: '변하기 마련이다, 실수하기 마련이다' },
    ],
    nuanceComparison: '和 “-게 되어 있다” 意思相近，但 -기 마련이다 带有更强的“人生常理、自然如此”的议论文语感。',
    examples: [
      {
        korean: '처음 외국어를 배울 때는 누구나 실수하기 마련이에요.',
        spokenPronunciation: '[처음 외구거를 배울 때는 누구나 실쑤하기 마려니에요]',
        chinese: '刚开始学外语的时候，任谁都难免会出错。',
      },
      {
        korean: '오랜 시간 꾸준히 노력하면 결국 좋은 결과가 나오기 마련입니다.',
        spokenPronunciation: '[오랜 시간 꾸준히 노려카면 결국 조은 결과가 나오기 마려님니다]',
        chinese: '只要长时间持之以恒地努力，最终必然会收获好结果。',
      },
    ],
    challengePromptZh: '造句：时间久了，再难过的回忆也会慢慢淡忘。',
    hintWords: [
      { kr: '시간이 지나다', zh: '时间流逝' },
      { kr: '힘든 기억', zh: '难过的回忆' },
      { kr: '잊히다', zh: '被遗忘' },
    ],
    sampleAnswerKr: '시간이 지나면 아무리 힘든 기억도 서서히 잊히기 마련이에요.',
  },
  {
    id: 'g-barame',
    pattern: '-(으)ㄴ/는 바람에',
    titleZh: '突发意外导致负面结果（“都怪……结果……”）',
    level: 'TOPIK 3-4级',
    summary: '强调由于某个未曾预料的突发情况，引发了不希望发生的负面后果；后句通常使用过去时。',
    conjugationRules: [
      { condition: '动词词干', formula: '动词词干 + 는 바람에', example: '늦잠을 자는 바람에, 비가 오는 바람에' },
      { condition: '名词直接修饰', formula: '名词 + 바람에', example: '갑작스러운 사고 바람에' },
    ],
    nuanceComparison: 'TOPIK 中级经典辨析：-덕분에 用于好结果（多亏了），-는 바람에 专门用于突发导致的坏结果，后句不能接积极结果！',
    examples: [
      {
        korean: '알람을 못 듣고 늦잠을 자는 바람에 기차를 놓쳤어요.',
        spokenPronunciation: '[알라믈 못 뜯꼬 늦짜믈 자는 바라메 기차를 노쳐써요]',
        chinese: '没听见闹钟睡过头了，结果错过了火车。',
      },
      {
        korean: '갑자기 폭설이 내리는 바람에 비행기가 연착됐습니다.',
        spokenPronunciation: '[갑짜기 폭써리 내리는 바라메 비행기가 연착뙈씀니다]',
        chinese: '因为突然下起暴雪，航班延误了。',
      },
    ],
    challengePromptZh: '造句：因为手机突然没电关机了，没能联系上朋友。',
    hintWords: [
      { kr: '휴대폰 배터리가 나가다', zh: '手机没电' },
      { kr: '연락하다', zh: '联系' },
    ],
    sampleAnswerKr: '휴대폰 배터리가 갑자기 나가는 바람에 친구에게 연락하지 못했어요.',
  },
  {
    id: 'g-ge-doeda',
    pattern: '-게 되다',
    titleZh: '客观促成的状态转变（“变得…… / 得以……”）',
    level: 'TOPIK 3-4级',
    summary: '表示并非单纯靠个人主观意志，而是顺应环境、机会或时间推移而自然达成的结果或状态变化。',
    conjugationRules: [
      { condition: '动词/形容词词干', formula: '词干 + 게 되다', example: '알게 됐어요, 살게 됐어요, 좋아하게 됐어요' },
    ],
    nuanceComparison: '介绍自己为什么学韩语、怎么来到某家公司工作时，用 “한국 드라마를 보다가 한국어를 공부하게 됐어요” 比单纯过去时更自然委婉。',
    examples: [
      {
        korean: '한국 친구를 사귀면서 한국 문화에 관심을 갖게 됐어요.',
        spokenPronunciation: '[한국 친구를 사귀면서 한국 문하에 관시믈 갇께 돼써요]',
        chinese: '在结交韩国朋友的过程中，渐渐对韩国文化产生了兴趣。',
      },
      {
        korean: '이번 달부터 새로운 팀에서 일하게 되었습니다.',
        spokenPronunciation: '[이번 달부터 새로운 티메서 일하게 되어씀니다]',
        chinese: '从这个月开始，我得以在新的团队工作了。',
      },
    ],
    challengePromptZh: '造句：通过每天跟读练习，我变得敢于开口说韩语了。',
    hintWords: [
      { kr: '매일 따라 읽다', zh: '每天跟读' },
      { kr: '자신 있게 말하다', zh: '自信地说' },
    ],
    sampleAnswerKr: '매일 따라 읽는 연습을 하다가 이제는 자신 있게 한국어를 말하게 됐어요.',
  },
  {
    id: 'g-deokbune',
    pattern: '-(으)ㄴ/는 덕분에 / N 덕분에',
    titleZh: '表达积极感谢的原因（“多亏了……”）',
    level: 'TOPIK 3-4级',
    summary: '专门用于引出带来正面、令人感激的好结果的原因，与表达消极原因的 “탓에 / 바람에” 形成鲜明对比。',
    conjugationRules: [
      { condition: '名词后', formula: '名词 + 덕분에', example: '선생님 덕분에, 응원 덕분에' },
      { condition: '动词过去/现在', formula: '词干 + (으)ㄴ/는 덕분에', example: '도와주신 덕분에, 미리 준비한 덕분에' },
    ],
    nuanceComparison: '职场致谢与演讲开场必用金句：“여러분 덕분에 무사히 마칠 수 있었습니다（多亏了各位，才得以顺利完成）”。',
    examples: [
      {
        korean: '선생님이 친절하게 발음을 교정해 주신 덕분에 실력이 늘었어요.',
        spokenPronunciation: '[선생니미 친절하게 바르믈 교정해 주신 덕뿌네 실려기 느러써요]',
        chinese: '多亏老师耐心帮我纠正发音，水平提高很多。',
      },
      {
        korean: '미리 예매한 덕분에 좋은 자리에서 공연을 봤어요.',
        spokenPronunciation: '[미리 예매한 덕뿌네 조은 자리에서 공여늘 봐써요]',
        chinese: '多亏提前订了票，在好位置看了演出。',
      },
    ],
    challengePromptZh: '造句：多亏每天坚持复习错题，这次考试考得很顺利。',
    hintWords: [
      { kr: '틀린 문제', zh: '错题' },
      { kr: '복습하다', zh: '复习' },
      { kr: '시험을 잘 보다', zh: '考得好' },
    ],
    sampleAnswerKr: '매일 틀린 문제를 꼼꼼히 복습한 덕분에 이번 시험을 잘 봤어요.',
  },

  // ================= TOPIK 5-6级 =================
  {
    id: 'g-banmyeone',
    pattern: '-(으)ㄴ/는 반면에',
    titleZh: '正反两面对照对比（“……而另一方面却……”）',
    level: 'TOPIK 5-6级',
    summary: 'TOPIK 54题大作文与高级阅读出镜率最高的高级对比连接结构，用于客观呈现同一事物的利弊两面或两个对象的截然相反特征。',
    conjugationRules: [
      { condition: '动词现在时', formula: '动词词干 + 는 반면에', example: '증가하는 반면에' },
      { condition: '形容词 / 动词过去', formula: '词干 + (으)ㄴ 반면에', example: '편리한 반면에, 줄어든 반면에' },
      { condition: '名词', formula: '名词 + 인 반면에', example: '장점인 반면에' },
    ],
    nuanceComparison: '比初级的 -지만 更有逻辑张力与学术书面感，53题图表对比两组数据时几乎必用。',
    examples: [
      {
        korean: '온라인 쇼핑은 시간과 비용을 아낄 수 있는 반면에 직접 물건을 확인하기 어렵습니다.',
        spokenPronunciation: '[온라인 쇼핑은 시간과 비용을 아낄 쑤 인는 반며네 직접 물거늘 화기나기 어렵씀니다]',
        chinese: '网购虽然能节省时间与成本，但另一方面很难亲眼确认商品。',
      },
      {
        korean: '대도시 인구는 꾸준히 늘어나는 반면에 지방 인구는 감소하는 추세입니다.',
        spokenPronunciation: '[대도시 인구는 꾸준히 드러나는 반며네 지방 인구는 감소하는 추세임니다]',
        chinese: '大城市人口持续增长，而地方人口却呈减少趋势。',
      },
    ],
    challengePromptZh: '造句：AI 技术提升了工作效率，但另一方面也带来了隐私保护方面的担忧。',
    hintWords: [
      { kr: '업무 효율을 높이다', zh: '提高工作效率' },
      { kr: '개인정보 보호', zh: '隐私保护' },
      { kr: '우려', zh: '担忧' },
    ],
    sampleAnswerKr: '인공지능 기술은 업무 효율을 높여 주는 반면에 개인정보 보호에 대한 우려도 낳고 있습니다.',
  },
  {
    id: 'g-ppunman-anira',
    pattern: '-(으)ㄹ 뿐만 아니라',
    titleZh: '递进叠加（“不仅……而且还……”）',
    level: 'TOPIK 5-6级',
    summary: '在肯定前项内容的基础上，进一步叠加更重要或更深层的后项内容，后句常搭配 “도 / 또한 / 게다가”。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + (으)ㄹ 뿐만 아니라', example: '맛있을 뿐만 아니라, 배울 뿐만 아니라' },
      { condition: '名词', formula: '名词 + 뿐만 아니라', example: '국내뿐만 아니라 해외에서도' },
    ],
    nuanceComparison: '注意名词直接接 뿐만 아니라（中间不空格），动词/形容词后接 -(으)ㄹ 뿐만 아니라（ㄹ 与 뿐 之间空格）。',
    examples: [
      {
        korean: '규칙적인 운동은 체력을 길러 줄 뿐만 아니라 스트레스 해소에도 효과적입니다.',
        spokenPronunciation: '[규칙쩌긴 운동은 체려글 길러 줄 뿐마나니라 스트레스 해소에도 효꽈저김니다]',
        chinese: '规律运动不仅能增强体力，而且对缓解压力也很有效。',
      },
      {
        korean: '한국어는 발음이 매력적일 뿐만 아니라 문법 체계도 매우 논리적입니다.',
        spokenPronunciation: '[한구거는 바르미 매력쩌길 뿐마나니라 문뻡 체계도 매우 놀리저김니다]',
        chinese: '韩语不仅发音富有魅力，语法体系也非常严谨有逻辑。',
      },
    ],
    challengePromptZh: '造句：阅读不仅能扩充词汇量，还能培养独立思考的能力。',
    hintWords: [
      { kr: '독서', zh: '阅读' },
      { kr: '어휘력을 늘리다', zh: '扩充词汇量' },
      { kr: '사고력을 기르다', zh: '培养思考力' },
    ],
    sampleAnswerKr: '독서는 어휘력을 늘려 줄 뿐만 아니라 깊이 있는 사고력도 길러 줍니다.',
  },
  {
    id: 'g-ro-inhae',
    pattern: '-(으)로 인해(서)',
    titleZh: '正式书面原因（“由于……所致”）',
    level: 'TOPIK 5-6级',
    summary: '新闻报道、官方公告、TOPIK 53/54 作文中替代 “때문에” 的高级书面因果结构，多接名词或名词化短语。',
    conjugationRules: [
      { condition: '有收音（ㄹ 除外）', formula: '名词 + 으로 인해(서) / 으로 인한 + 名词', example: '기후 변화로 인해, 스트레스로 인한 질병' },
      { condition: '无收音或 ㄹ 收音', formula: '名词 + 로 인해(서) / 로 인한 + 名词', example: '사고로 인해, 과로로 인한 피로' },
    ],
    nuanceComparison: '修饰后续名词时变为 “-(으)로 인한 N”（如 기후 변화로 인한 피해，由气候变化造成的损失），写作瞬间提档！',
    examples: [
      {
        korean: '급격한 고령화로 인해 사회 복지 제도의 개선이 시급합니다.',
        spokenPronunciation: '[급껴칸 고령화로 인해 사회 복찌 제도의 개서니 시그팜니다]',
        chinese: '由于急剧老龄化，社会福利制度的完善迫在眉睫。',
      },
      {
        korean: '수면 부족으로 인한 집중력 저하를 예방해야 합니다.',
        spokenPronunciation: '[수면 부조그로 인한 집쭝녁 저하를 예방해야 함니다]',
        chinese: '应当预防因睡眠不足引起的专注力下降。',
      },
    ],
    challengePromptZh: '造句：由于智能手机的普及，人与人之间面对面交流的时间减少了。',
    hintWords: [
      { kr: '스마트폰 보급', zh: '智能手机普及' },
      { kr: '직접 대화하다', zh: '面对面交流' },
      { kr: '감소하다', zh: '减少' },
    ],
    sampleAnswerKr: '스마트폰 보급으로 인해 사람들끼리 직접 대화하는 시간이 크게 감소했습니다.',
  },
  {
    id: 'g-gie-apseo',
    pattern: '-기에 앞서 / N에 앞서',
    titleZh: '正式开场与前置步骤（“在……之前”）',
    level: 'TOPIK 5-6级',
    summary: '比初级的 -기 전에 更庄重、正式，常用于发表演讲、推进改革或探讨方案前强调必须先完成的前提动作。',
    conjugationRules: [
      { condition: '动词词干', formula: '词干 + 기에 앞서(서)', example: '발표를 시작하기에 앞서, 정책을 시행하기에 앞서' },
      { condition: '名词后', formula: '名词 + 에 앞서(서)', example: '본격적인 논의에 앞서' },
    ],
    nuanceComparison: 'TOPIK 听力演讲题开头与大作文引言段常用 “문제를 해결하기에 앞서 먼저 원인을 정확히 파악해야 한다”。',
    examples: [
      {
        korean: '새로운 정책을 도입하기에 앞서 충분한 시범 운영이 필요합니다.',
        spokenPronunciation: '[새로운 정책을 도이파기에 압써 충분한 시범 운영이 피료함니다]',
        chinese: '在引入新政策之前，需要充分的试点运行。',
      },
      {
        korean: '발표를 시작하기에 앞서 참석해 주신 모든 분께 감사드립니다.',
        spokenPronunciation: '[발표를 시자카기에 압써 참서캐 주신 모든 분께 감사드림니다]',
        chinese: '在开始演讲之前，感谢到场的每一位嘉宾。',
      },
    ],
    challengePromptZh: '造句：在寻找解决方案之前，我们应该先准确分析问题的原因。',
    hintWords: [
      { kr: '해결책을 찾다', zh: '寻找解决方案' },
      { kr: '원인을 분석하다', zh: '分析原因' },
    ],
    sampleAnswerKr: '해결책을 찾기에 앞서 먼저 문제의 근본적인 원인을 정확히 분석해야 합니다.',
  },
  {
    id: 'g-geuchiji-anko',
    pattern: '-는 데(에) 그치지 않고',
    titleZh: '高级递进突破（“不止步于……而是进一步……”）',
    level: 'TOPIK 5-6级',
    summary: 'TOPIK 6级高分写作王牌句型：指出某种现象、努力或影响没有停留在初级层面，而是向更广阔深远的层次扩展。',
    conjugationRules: [
      { condition: '动词词干', formula: '动词词干 + 는 데(에) 그치지 않고', example: '단순히 암기하는 데 그치지 않고' },
      { condition: '名词后', formula: '名词 + 에 그치지 않고', example: '일시적인 유행에 그치지 않고' },
    ],
    nuanceComparison: '可把普通的 “뿐만 아니라” 升级为 “-는 데 그치지 않고”，在 54 题 600 字议论文中极易拿到高级表达加分。',
    examples: [
      {
        korean: '단어를 단순히 외우는 데 그치지 않고 실제 회화에서 써 봐야 합니다.',
        spokenPronunciation: '[다너를 단순히 외우는 데 그치지 안코 실쩨 회화에서 써 봐야 함니다]',
        chinese: '不能只停留在单纯背诵单词，还要在实际会话中试着用出来。',
      },
      {
        korean: '이 캠페인은 일회성 행사에 그치지 않고 시민들의 생활 습관을 바꾸어 놓았습니다.',
        spokenPronunciation: '[이 캠페이는 일회썽 행사에 그치지 안코 시민드레 생활 습꽈늘 바꾸어 노아씀니다]',
        chinese: '这项倡议没有止步于一次性活动，而是彻底改变了市民的生活习惯。',
      },
    ],
    challengePromptZh: '造句：学语言不能止步于看懂课本，还要了解当地的文化与生活习惯。',
    hintWords: [
      { kr: '교과서를 이해하다', zh: '看懂课本' },
      { kr: '현지 문화', zh: '当地文化' },
    ],
    sampleAnswerKr: '외국어 학습은 교과서를 이해하는 데 그치지 않고 현지 문화와 생활 습관까지 익혀야 합니다.',
  },
  {
    id: 'g-gi-sipsangida',
    pattern: '-기 십상이다',
    titleZh: '高级警示表达（“十有八九容易…… / 极易……”）',
    level: 'TOPIK 5-6级',
    summary: '汉字词“十常（十回里有八九回）”演变而来，用于警示如果疏忽大意，就极容易产生某种不良后果。',
    conjugationRules: [
      { condition: '动词词干', formula: '动词词干 + 기 십상이다', example: '놓치기 십상이다, 오해를 사기 십상이다' },
    ],
    nuanceComparison: '与中性的 “-기 쉽다（容易）” 不同，-기 십상이다 几乎专门用于提醒负面风险或失误，语感地道高级。',
    examples: [
      {
        korean: '기초 발음을 대충 넘어가면 나중에 고치기 어려워지고 실수하기 십상입니다.',
        spokenPronunciation: '[기초 바르믈 대충 너머가면 나중애 고치기 어려워지고 실쑤하기 십쌍임니다]',
        chinese: '如果基础发音草草带过，以后不仅难改，还十有八九容易出错。',
      },
      {
        korean: '충분한 조사 없이 성급하게 결정하면 시행착오를 겪기 십상이다.',
        spokenPronunciation: '[충분한 조사 업씨 성그파게 결정하면 시행차고를 격끼 십쌍이다]',
        chinese: '若未经充分调查就仓促决定，极易走弯路碰壁。',
      },
    ],
    challengePromptZh: '造句：如果不做好时间管理，备考期间很容易感到焦虑和疲惫。',
    hintWords: [
      { kr: '시간 관리를 잘하다', zh: '做好时间管理' },
      { kr: '지치다', zh: '疲惫' },
    ],
    sampleAnswerKr: '시간 관리를 제대로 하지 않으면 시험 준비 기간에 쉽게 지치기 십상입니다.',
  },
];
