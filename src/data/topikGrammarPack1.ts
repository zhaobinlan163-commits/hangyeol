import type { GrammarLesson } from '../types/learning';

/**
 * TOPIK 1-2 级补充语法包（24 条）
 * 补齐敬语体系、时制体、否定、基础助词与推测表达等入门必备点。
 */
export const TOPIK_GRAMMAR_PACK_1: GrammarLesson[] = [
  {
    id: 'g2-seumnida',
    pattern: '-습니다/ㅂ니다',
    titleZh: '正式敬语终结词尾',
    level: 'TOPIK 1级',
    summary: '对长辈、上司或正式场合使用的最高敬语结尾，和 -아/어요 意思相同但更正式，新闻播报、面试、演讲都用它。',
    conjugationRules: [
      { condition: '词干有收音', formula: '词干 + -습니다', example: '먹다 → 먹습니다 / 좋다 → 좋습니다' },
      { condition: '词干无收音', formula: '词干 + -ㅂ니다', example: '가다 → 갑니다 / 하다 → 합니다' },
    ],
    nuanceComparison: '同样一句「我去」，갑니다 是新闻/汇报语气，가요 是日常礼貌语气。跟朋友说 갑니다 会显得像在念稿。',
    examples: [
      {
        korean: '저는 매일 아침 한국어를 공부합니다.',
        spokenPronunciation: '[저는 매일 아침 한국어를 공부함니다]',
        chinese: '我每天早上学习韩语。（正式）',
      },
      {
        korean: '지금 회의 중입니다. 나중에 전화드리겠습니다.',
        spokenPronunciation: '[지금 회이 중임니다. 나중에 전화드리겓씀니다]',
        chinese: '现在正在开会，稍后给您回电话。',
      },
    ],
    challengePromptZh: '造句：我是学生，每天坐地铁去学校。（用 -습니다 体）',
    hintWords: [
      { kr: '학생', zh: '学生' },
      { kr: '지하철', zh: '地铁' },
      { kr: '학교', zh: '学校' },
    ],
    sampleAnswerKr: '저는 학생입니다. 매일 지하철로 학교에 갑니다.',
  },
  {
    id: 'g2-ieyo',
    pattern: '-이에요/예요',
    titleZh: '名词判断句「是……」',
    level: 'TOPIK 1级',
    summary: '最常用的「A 是 B」句型，礼貌体。前字有收音用 -이에요，无收音用 -예요。',
    conjugationRules: [
      { condition: '前字有收音', formula: '名词 + -이에요', example: '학생 → 학생이에요' },
      { condition: '前字无收音', formula: '名词 + -예요', example: '의사 → 의사예요' },
    ],
    nuanceComparison: '-입니다 是正式体，-이에요/예요 是日常礼貌体；口语里还常缩成 -이야/야（对朋友）。',
    examples: [
      {
        korean: '저는 중국 사람이에요.',
        spokenPronunciation: '[저는 중궁 사라미에요]',
        chinese: '我是中国人。',
      },
      {
        korean: '이거 뭐예요? 제 우산이에요.',
        spokenPronunciation: '[이거 뭐예요? 제 우사니에요]',
        chinese: '这是什么？是我的雨伞。',
      },
    ],
    challengePromptZh: '造句：这是我的朋友，他是韩国人。',
    hintWords: [
      { kr: '친구', zh: '朋友' },
      { kr: '한국 사람', zh: '韩国人' },
      { kr: '이거', zh: '这个' },
    ],
    sampleAnswerKr: '이 사람은 제 친구예요. 친구는 한국 사람이에요.',
  },
  {
    id: 'g2-anida',
    pattern: '-이/가 아니다',
    titleZh: '否定判断「不是……」',
    level: 'TOPIK 1级',
    summary: '-이에요/예요 的否定形式，表示「不是」。口语里常用 -아니에요 或 -아니야。',
    conjugationRules: [
      { condition: '有收音', formula: '名词 + 이/가 아니에요', example: '학생이 아니에요' },
      { condition: '无收音', formula: '名词 + 가 아니에요', example: '의사가 아니에요' },
    ],
    nuanceComparison: '注意 -이/가 아니다 的助词要跟着名词收音变，不能说「학생은 아니에요」——那是「至于学生嘛，不是」的对比语气。',
    examples: [
      {
        korean: '저는 선생님이 아니에요. 학생이에요.',
        spokenPronunciation: '[저는 선생니미 아니에요. 학생이에요]',
        chinese: '我不是老师，是学生。',
      },
      {
        korean: '이건 제 가방이 아니에요.',
        spokenPronunciation: '[이건 제 가방이 아니에요]',
        chinese: '这不是我的包。',
      },
    ],
    challengePromptZh: '造句：这不是咖啡，是茶。',
    hintWords: [
      { kr: '커피', zh: '咖啡' },
      { kr: '차', zh: '茶' },
    ],
    sampleAnswerKr: '이건 커피가 아니에요. 차예요.',
  },
  {
    id: 'g2-e-itda',
    pattern: '-에 있다/없다',
    titleZh: '存在句「在……／不在……」',
    level: 'TOPIK 1级',
    summary: '表示人或物存在于某处，位置名词后用 -에，动词用 있다/없다。',
    conjugationRules: [
      { condition: '肯定', formula: '场所 + 에 + 있다', example: '집에 있어요' },
      { condition: '否定', formula: '场所 + 에 + 없다', example: '집에 없어요' },
    ],
    nuanceComparison: '「책상 위에 책이 있어요」强调存在；「책은 책상 위에 있어요」强调位置。前者更自然。',
    examples: [
      {
        korean: '화장실이 어디에 있어요?',
        spokenPronunciation: '[화장시리 어디에 이써요?]',
        chinese: '洗手间在哪里？',
      },
      {
        korean: '고양이가 소파 위에 있어요.',
        spokenPronunciation: '[고양이가 소파 위에 이써요]',
        chinese: '猫在沙发上。',
      },
    ],
    challengePromptZh: '造句：我的手机在包里。',
    hintWords: [
      { kr: '휴대폰', zh: '手机' },
      { kr: '가방', zh: '包' },
      { kr: '안', zh: '里面' },
    ],
    sampleAnswerKr: '제 휴대폰은 가방 안에 있어요.',
  },
  {
    id: 'g2-euseyo',
    pattern: '-(으)세요',
    titleZh: '敬语请求「请……」',
    level: 'TOPIK 1级',
    summary: '对长辈或陌生人提出请求、劝诱的敬语命令式，比 -아/어 주세요 更简短通用。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -으세요', example: '앉다 → 앉으세요' },
      { condition: '无收音', formula: '词干 + -세요', example: '가다 → 가세요' },
    ],
    nuanceComparison: '-세요 是「请做」；-아/어 주세요 是「请为我做」，带受惠意味。让座说 앉으세요，帮你拿东西说 들어 주세요。',
    examples: [
      {
        korean: '여기 앉으세요.',
        spokenPronunciation: '[여기 안즈세요]',
        chinese: '请坐这里。',
      },
      {
        korean: '조금만 기다리세요.',
        spokenPronunciation: '[조금만 기다리세요]',
        chinese: '请稍等一下。',
      },
    ],
    challengePromptZh: '造句：请慢慢说。',
    hintWords: [
      { kr: '천천히', zh: '慢慢地' },
      { kr: '말하다', zh: '说' },
    ],
    sampleAnswerKr: '천천히 말씀하세요.',
  },
  {
    id: 'g2-go',
    pattern: '-고',
    titleZh: '并列连接「……并且……」',
    level: 'TOPIK 1级',
    summary: '把两个动作或状态并列起来，前后顺序可以互换；也常用来罗列。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -고', example: '먹다 → 먹고 / 예쁘다 → 예쁘고' },
      { condition: '名词', formula: '名词 + -이고', example: '학생이고' },
    ],
    nuanceComparison: '-고 只是并列，不表示因果；-아/어서 才带「因此」。「비가 오고 추워요」是又下雨又冷，「비가 와서 추워요」是因为下雨所以冷。',
    examples: [
      {
        korean: '저는 커피를 마시고 책을 읽어요.',
        spokenPronunciation: '[저는 커피를 마시고 채글 일거요]',
        chinese: '我一边喝咖啡一边看书。',
      },
      {
        korean: '이 방은 넓고 밝아요.',
        spokenPronunciation: '[이 방은 널꼬 발가요]',
        chinese: '这个房间又宽敞又明亮。',
      },
    ],
    challengePromptZh: '造句：我喜欢音乐，也喜欢电影。',
    hintWords: [
      { kr: '음악', zh: '音乐' },
      { kr: '영화', zh: '电影' },
      { kr: '좋아하다', zh: '喜欢' },
    ],
    sampleAnswerKr: '저는 음악을 좋아하고 영화도 좋아해요.',
  },
  {
    id: 'g2-eulkkayo',
    pattern: '-(으)ㄹ까요?',
    titleZh: '提议与推测「要……吗？」',
    level: 'TOPIK 1级',
    summary: '征求对方意见（我们一起……吧？）或对不确定的事做推测（会不会……？）。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -을까요?', example: '먹다 → 먹을까요?' },
      { condition: '无收音', formula: '词干 + -ㄹ까요?', example: '가다 → 갈까요?' },
    ],
    nuanceComparison: '主语是「我们」时是提议（우리 갈까요?），主语是第三人称时是推测（내일 비가 올까요?）。',
    examples: [
      {
        korean: '우리 같이 점심 먹을까요?',
        spokenPronunciation: '[우리 가치 점심 머글까요?]',
        chinese: '我们一起吃午饭吧？',
      },
      {
        korean: '내일 날씨가 좋을까요?',
        spokenPronunciation: '[내일 날씨가 조을까요?]',
        chinese: '明天天气会好吗？',
      },
    ],
    challengePromptZh: '造句：我们周末去看电影吧？',
    hintWords: [
      { kr: '주말', zh: '周末' },
      { kr: '영화', zh: '电影' },
      { kr: '보다', zh: '看' },
    ],
    sampleAnswerKr: '주말에 우리 같이 영화 볼까요?',
  },
  {
    id: 'g2-ji-anta',
    pattern: '-지 않다 / -지 못하다',
    titleZh: '两种否定：不……／不能……',
    level: 'TOPIK 1级',
    summary: '-지 않다 是主观否定（不想、不做），-지 못하다 是能力或外部原因导致的「做不到」。',
    conjugationRules: [
      { condition: '一般否定', formula: '词干 + -지 않다', example: '가다 → 가지 않아요' },
      { condition: '能力否定', formula: '词干 + -지 못하다', example: '가다 → 가지 못해요' },
    ],
    nuanceComparison: '「안 가요」＝不去（意愿），「못 가요」＝去不了（有事/没能力）。-지 않다 和 안 意思相近，书面语更常用 -지 않다。',
    examples: [
      {
        korean: '오늘은 술을 마시지 않아요.',
        spokenPronunciation: '[오느른 수를 마시지 아나요]',
        chinese: '今天不喝酒。（主观）',
      },
      {
        korean: '어제 잠을 자지 못했어요.',
        spokenPronunciation: '[어제 자믈 자지 모태써요]',
        chinese: '昨天没睡着。（做不到）',
      },
    ],
    challengePromptZh: '造句：我不吃肉，也不能吃辣的。',
    hintWords: [
      { kr: '고기', zh: '肉' },
      { kr: '매운 음식', zh: '辣的食物' },
      { kr: '먹다', zh: '吃' },
    ],
    sampleAnswerKr: '저는 고기를 먹지 않아요. 매운 음식도 먹지 못해요.',
  },
  {
    id: 'g2-eseo-buteo',
    pattern: '-에서 / -부터',
    titleZh: '起点「从……」',
    level: 'TOPIK 1级',
    summary: '-에서 表示动作发生的起点场所，-부터 表示时间或顺序的起点。',
    conjugationRules: [
      { condition: '场所起点', formula: '场所 + -에서', example: '학교에서' },
      { condition: '时间起点', formula: '时间 + -부터', example: '9시부터' },
    ],
    nuanceComparison: '「집에서 회사까지」是从家到公司（空间）；「9시부터 6시까지」是从九点到六点（时间）。时间不能用 에서。',
    examples: [
      {
        korean: '아침 9시부터 수업이 있어요.',
        spokenPronunciation: '[아침 아홉시부터 수오비 이써요]',
        chinese: '从早上九点开始有课。',
      },
      {
        korean: '부산에서 서울까지 기차로 가요.',
        spokenPronunciation: '[부사네서 서울까지 기차로 가요]',
        chinese: '从釜山坐火车到首尔。',
      },
    ],
    challengePromptZh: '造句：从星期一到星期五上班。',
    hintWords: [
      { kr: '월요일', zh: '星期一' },
      { kr: '금요일', zh: '星期五' },
      { kr: '일하다', zh: '工作' },
    ],
    sampleAnswerKr: '월요일부터 금요일까지 일해요.',
  },
  {
    id: 'g2-hante',
    pattern: '-에게 / -한테 / -께',
    titleZh: '对象助词「给／对……」',
    level: 'TOPIK 1级',
    summary: '表示动作的对象（给某人、对某人说）。-한테 口语，-에게 书面/中性，-께 是「께서」对应的敬语对象。',
    conjugationRules: [
      { condition: '口语', formula: '人 + -한테', example: '친구한테' },
      { condition: '书面/中性', formula: '人 + -에게', example: '선생님에게' },
      { condition: '敬语对象', formula: '长辈 + -께', example: '할머니께' },
    ],
    nuanceComparison: '对长辈一定要用 -께：「선생님께 물어봤어요」。说「선생님한테」不算错，但不够尊敬。',
    examples: [
      {
        korean: '친구한테 선물을 줬어요.',
        spokenPronunciation: '[친구한테 선무를 줘써요]',
        chinese: '给了朋友一个礼物。',
      },
      {
        korean: '선생님께 질문이 있어요.',
        spokenPronunciation: '[선생님께 지르미 이써요]',
        chinese: '我有问题想问老师。',
      },
    ],
    challengePromptZh: '造句：我给妈妈打了电话。',
    hintWords: [
      { kr: '어머니', zh: '妈妈' },
      { kr: '전화하다', zh: '打电话' },
    ],
    sampleAnswerKr: '어머니께 전화했어요.',
  },
  {
    id: 'g2-euro',
    pattern: '-(으)로',
    titleZh: '方向·手段·材料',
    level: 'TOPIK 1级',
    summary: '表示方向（往……）、手段/工具（用……）、材料（用……做的）。',
    conjugationRules: [
      { condition: '有收音（ㄹ除外）', formula: '名词 + -으로', example: '버스 → 버스으로 (X) → 버스로' },
      { condition: '无收音或ㄹ收音', formula: '名词 + -로', example: '지하철로 / 연필로' },
    ],
    nuanceComparison: '-에 只表目的地（学校에 가다），-로 强调方向或路径（학교로 가다＝朝学校方向去），也表手段（지하철로）。',
    examples: [
      {
        korean: '지하철로 회사에 가요.',
        spokenPronunciation: '[지하철로 회사에 가요]',
        chinese: '坐地铁去公司。',
      },
      {
        korean: '이 빵은 쌀로 만들었어요.',
        spokenPronunciation: '[이 빵은 싸로 만드러써요]',
        chinese: '这个面包是用米做的。',
      },
    ],
    challengePromptZh: '造句：请用韩语说。',
    hintWords: [
      { kr: '한국어', zh: '韩语' },
      { kr: '말하다', zh: '说' },
    ],
    sampleAnswerKr: '한국어로 말해 주세요.',
  },
  {
    id: 'g2-mada',
    pattern: '-마다 / -씩',
    titleZh: '「每……」与「各／每份」',
    level: 'TOPIK 1级',
    summary: '-마다 表示「每一个都」，-씩 表示按份量分配（一天一次、一人一个）。',
    conjugationRules: [
      { condition: '每一个', formula: '名词 + -마다', example: '날마다 / 사람마다' },
      { condition: '按量分配', formula: '数量 + -씩', example: '하나씩 / 하루에 두 번씩' },
    ],
    nuanceComparison: '-마다 强调无一例外（사람마다 달라요＝每个人都不同）；-씩 强调分配单位（한 명씩 들어오세요＝一个一个进来）。',
    examples: [
      {
        korean: '사람마다 생각이 달라요.',
        spokenPronunciation: '[사람마다 생각이 달라요]',
        chinese: '每个人想法都不一样。',
      },
      {
        korean: '하루에 두 번씩 약을 먹어요.',
        spokenPronunciation: '[하루에 두 번씩 야글 머거요]',
        chinese: '一天吃两次药。',
      },
    ],
    challengePromptZh: '造句：请一个一个进来。',
    hintWords: [
      { kr: '한 명', zh: '一个人' },
      { kr: '들어오다', zh: '进来' },
    ],
    sampleAnswerKr: '한 명씩 들어오세요.',
  },
  {
    id: 'g2-go-itda',
    pattern: '-고 있다',
    titleZh: '进行体「正在……」',
    level: 'TOPIK 2级',
    summary: '表示动作正在进行，相当于英语的 be -ing；也可表示持续的状态或习惯。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -고 있다', example: '읽다 → 읽고 있어요' },
      { condition: '过去进行', formula: '词干 + -고 있었어요', example: '자고 있었어요' },
    ],
    nuanceComparison: '「가고 있어요」＝正在去；「가 있어요」不成立。注意「입고 있어요」既可解「正在穿」也可解「穿着」。',
    examples: [
      {
        korean: '지금 뭐 하고 있어요?',
        spokenPronunciation: '[지금 뭐 하고 이써요?]',
        chinese: '现在在做什么？',
      },
      {
        korean: '비가 오고 있어요. 우산 챙기세요.',
        spokenPronunciation: '[비가 오고 이써요. 우산 챙기세요]',
        chinese: '正在下雨，记得带伞。',
      },
    ],
    challengePromptZh: '造句：我正在等朋友。',
    hintWords: [
      { kr: '기다리다', zh: '等' },
      { kr: '친구', zh: '朋友' },
    ],
    sampleAnswerKr: '저는 친구를 기다리고 있어요.',
  },
  {
    id: 'g2-a-eo-itda',
    pattern: '-아/어 있다',
    titleZh: '状态持续「……着」',
    level: 'TOPIK 2级',
    summary: '表示动作完成后留下的状态一直持续，常见于 앉아 있다、서 있다、열려 있다。',
    conjugationRules: [
      { condition: '自动词', formula: '词干 + -아/어 있다', example: '앉다 → 앉아 있다' },
      { condition: '被动形', formula: '词干 + -아/어 있다', example: '열리다 → 열려 있다' },
    ],
    nuanceComparison: '「문을 열고 있어요」是有人正在开门；「문이 열려 있어요」是门开着（状态）。',
    examples: [
      {
        korean: '창문이 열려 있어요.',
        spokenPronunciation: '[창무니 열려 이써요]',
        chinese: '窗户开着。',
      },
      {
        korean: '강아지가 문 앞에 앉아 있어요.',
        spokenPronunciation: '[강아지가 문 아페 안자 이써요]',
        chinese: '小狗坐在门口。',
      },
    ],
    challengePromptZh: '造句：灯亮着。',
    hintWords: [
      { kr: '불', zh: '灯' },
      { kr: '켜지다', zh: '被打开' },
    ],
    sampleAnswerKr: '불이 켜져 있어요.',
  },
  {
    id: 'g2-ass-eoss',
    pattern: '-았/었었-',
    titleZh: '过去完成与回忆',
    level: 'TOPIK 2级',
    summary: '表示更早的过去，或「曾经……但现在不是了」，常带遗憾或对比。',
    conjugationRules: [
      { condition: '有收音（ㅏ/ㅗ 除外）', formula: '词干 + -았었-', example: '먹다 → 먹었었어요' },
      { condition: '无收音', formula: '词干 + -었었-', example: '가다 → 갔었어요' },
    ],
    nuanceComparison: '「갔어요」只是过去；「갔었어요」是去过（现在不在那儿）。「한국에 갔었어요」＝去过韩国，「한국에 갔어요」＝去了韩国。',
    examples: [
      {
        korean: '작년에 제주도에 갔었어요.',
        spokenPronunciation: '[작녀네 제주도에 갔써써요]',
        chinese: '去年去过济州岛。',
      },
      {
        korean: '예전에는 여기 살았었어요.',
        spokenPronunciation: '[예저네는 여기 사랐써써요]',
        chinese: '以前在这儿住过。',
      },
    ],
    challengePromptZh: '造句：我以前是老师。',
    hintWords: [
      { kr: '예전에', zh: '以前' },
      { kr: '선생님', zh: '老师' },
    ],
    sampleAnswerKr: '예전에는 제가 선생님이었어요.',
  },
  {
    id: 'g2-get',
    pattern: '-겠-',
    titleZh: '意志、推测与委婉',
    level: 'TOPIK 2级',
    summary: '表示说话人的意志（我来做）、对情况的推测（应该会……），也让语气更委婉礼貌。',
    conjugationRules: [
      { condition: '意志', formula: '词干 + -겠습니다', example: '제가 하겠습니다' },
      { condition: '推测', formula: '词干 + -겠어요', example: '비가 오겠어요' },
    ],
    nuanceComparison: '-겠- 比 -(으)ㄹ 거예요 更正式、更有决心；服务行业常用「알겠습니다」「모시겠습니다」显得礼貌。',
    examples: [
      {
        korean: '제가 도와드리겠습니다.',
        spokenPronunciation: '[제가 도와드리겓씀니다]',
        chinese: '我来帮您。',
      },
      {
        korean: '내일은 추울 것 같아요. 감기 조심하세요.',
        spokenPronunciation: '[내이른 추울 꺼 가타요. 감기 조심하세요]',
        chinese: '明天好像会冷，小心感冒。',
      },
    ],
    challengePromptZh: '造句：我知道了，我会准时到的。',
    hintWords: [
      { kr: '알다', zh: '知道' },
      { kr: '제시간', zh: '准时' },
      { kr: '도착하다', zh: '到达' },
    ],
    sampleAnswerKr: '알겠습니다. 제시간에 도착하겠습니다.',
  },
  {
    id: 'g2-eulgeyo',
    pattern: '-(으)ㄹ게요',
    titleZh: '承诺「我会……的」',
    level: 'TOPIK 2级',
    summary: '当场向对方承诺或告知自己的决定，语气比 -겠습니다 亲切。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -을게요', example: '먹다 → 먹을게요' },
      { condition: '无收音', formula: '词干 + -ㄹ게요', example: '하다 → 할게요' },
    ],
    nuanceComparison: '-(으)ㄹ게요 需要听者在场（向你承诺），-(으)ㄹ 거예요 只是陈述计划。对空气说 할게요 不自然。',
    examples: [
      {
        korean: '제가 먼저 갈게요.',
        spokenPronunciation: '[제가 먼저 갈게요]',
        chinese: '我先走了。',
      },
      {
        korean: '내일 다시 전화드릴게요.',
        spokenPronunciation: '[내일 다시 전화드릴게요]',
        chinese: '明天再给您打电话。',
      },
    ],
    challengePromptZh: '造句：我先去占座位。',
    hintWords: [
      { kr: '자리', zh: '座位' },
      { kr: '맡다', zh: '占（位子）' },
    ],
    sampleAnswerKr: '제가 자리를 맡을게요.',
  },
  {
    id: 'g2-eullaeyo',
    pattern: '-(으)ㄹ래요?',
    titleZh: '询问意愿「要……吗？」',
    level: 'TOPIK 2级',
    summary: '询问对方的意愿或提议，回答常说 -을래요 / -을게요。语气随意，朋友之间最常用。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -을래요?', example: '먹다 → 먹을래요?' },
      { condition: '无收音', formula: '词干 + -ㄹ래요?', example: '가다 → 갈래요?' },
    ],
    nuanceComparison: '-(으)ㄹ래요? 是问对方想不想，-(으)ㄹ까요? 更偏向共同决定。对长辈用 -(으)실래요? 才礼貌。',
    examples: [
      {
        korean: '커피 마실래요?',
        spokenPronunciation: '[커피 마실래요?]',
        chinese: '要喝咖啡吗？',
      },
      {
        korean: '같이 갈래요? 저는 좋아요.',
        spokenPronunciation: '[가치 갈래요? 저는 조아요]',
        chinese: '要一起去吗？我乐意。',
      },
    ],
    challengePromptZh: '造句：你想吃辣的吗？',
    hintWords: [
      { kr: '매운 음식', zh: '辣的食物' },
      { kr: '먹다', zh: '吃' },
    ],
    sampleAnswerKr: '매운 음식 먹을래요?',
  },
  {
    id: 'g2-giro-hada',
    pattern: '-기로 하다',
    titleZh: '决定「决定……」',
    level: 'TOPIK 2级',
    summary: '表示已经做出的决定或约定，常和 시간/장소 一起出现。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -기로 하다', example: '가다 → 가기로 했어요' },
      { condition: '名词', formula: '名词 + -로 하다', example: '주말로 했어요' },
    ],
    nuanceComparison: '-기로 하다 是决定本身；(으)ㄹ 거예요 是计划。-기로 했어요 强调「已经定下来了」。',
    examples: [
      {
        korean: '내일 아홉 시에 만나기로 했어요.',
        spokenPronunciation: '[내일 아홉시에 만나기로 해써요]',
        chinese: '约好明天九点见面。',
      },
      {
        korean: '올해부터 운동을 시작하기로 했어요.',
        spokenPronunciation: '[올해부터 우농을 시작하기로 해써요]',
        chinese: '决定从今年开始运动。',
      },
    ],
    challengePromptZh: '造句：我们决定周末去爬山。',
    hintWords: [
      { kr: '주말', zh: '周末' },
      { kr: '등산', zh: '爬山' },
    ],
    sampleAnswerKr: '주말에 등산을 가기로 했어요.',
  },
  {
    id: 'g2-ryeomyeon',
    pattern: '-(으)려면',
    titleZh: '前提条件「要想……的话」',
    level: 'TOPIK 2级',
    summary: '表示「如果打算做某事」，后半句常接必须做的条件（-아/어야 해요）。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -으려면', example: '먹다 → 먹으려면' },
      { condition: '无收音', formula: '词干 + -려면', example: '가다 → 가려면' },
    ],
    nuanceComparison: '-(으)려면 后面不能直接接结论，通常要跟条件句：「가려면 지금 출발해야 해요」。',
    examples: [
      {
        korean: '한국어를 잘하려면 매일 연습해야 해요.',
        spokenPronunciation: '[한구거를 잘하리면 매일 연습해야 해요]',
        chinese: '想说好韩语，就得每天练。',
      },
      {
        korean: '지하철을 타려면 저쪽으로 가세요.',
        spokenPronunciation: '[지하처를 타리면 저쪼그로 가세요]',
        chinese: '要坐地铁的话，请往那边走。',
      },
    ],
    challengePromptZh: '造句：要想通过考试，得好好准备。',
    hintWords: [
      { kr: '시험', zh: '考试' },
      { kr: '합격하다', zh: '合格' },
      { kr: '준비하다', zh: '准备' },
    ],
    sampleAnswerKr: '시험에 합격하려면 준비를 잘해야 해요.',
  },
  {
    id: 'g2-a-eo-do-doeda',
    pattern: '-아/어도 되다',
    titleZh: '许可「可以……」',
    level: 'TOPIK 2级',
    summary: '询问或给予许可，回答常用 -아/어도 돼요 / -으면 안 돼요。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -아/어도 되다', example: '가다 → 가도 돼요' },
      { condition: '名词', formula: '名词 + -이어도 되다', example: '학생이어도 돼요' },
    ],
    nuanceComparison: '-아/어도 되다 是「允许」；-아/어야 하다 是「必须」。问「들어가도 돼요?」比「들어가도 괜찮아요?」更直接。',
    examples: [
      {
        korean: '여기 앉아도 돼요?',
        spokenPronunciation: '[여기 안자도 돼요?]',
        chinese: '可以坐这里吗？',
      },
      {
        korean: '내일 내도 돼요.',
        spokenPronunciation: '[내일 내도 돼요]',
        chinese: '明天交也可以。',
      },
    ],
    challengePromptZh: '造句：可以开窗吗？',
    hintWords: [
      { kr: '창문', zh: '窗户' },
      { kr: '열다', zh: '打开' },
    ],
    sampleAnswerKr: '창문을 열어도 돼요?',
  },
  {
    id: 'g2-myeon-an-doeda',
    pattern: '-(으)면 안 되다 / -지 말다',
    titleZh: '禁止「不可以／别……」',
    level: 'TOPIK 2级',
    summary: '-(으)면 안 되다 表示规则上不允许；-지 말다 是直接劝阻「别做」。',
    conjugationRules: [
      { condition: '规定禁止', formula: '词干 + -(으)면 안 되다', example: '들어가면 안 돼요' },
      { condition: '劝阻', formula: '词干 + -지 마세요', example: '가지 마세요' },
    ],
    nuanceComparison: '「여기서 담배 피우면 안 돼요」是规定；「담배 피우지 마세요」是劝你个人别抽。',
    examples: [
      {
        korean: '여기서 사진을 찍으면 안 돼요.',
        spokenPronunciation: '[여기서 사지늘 찌그면 안 돼요]',
        chinese: '这里不能拍照。',
      },
      {
        korean: '걱정하지 마세요.',
        spokenPronunciation: '[걱쩡하지 마세요]',
        chinese: '别担心。',
      },
    ],
    challengePromptZh: '造句：别迟到。',
    hintWords: [
      { kr: '늦다', zh: '迟到' },
    ],
    sampleAnswerKr: '늦지 마세요.',
  },
  {
    id: 'g2-neun-geot-gatda',
    pattern: '-는 것 같다',
    titleZh: '推测「好像……」',
    level: 'TOPIK 2级',
    summary: '根据迹象做出委婉判断，是日常最常用的推测表达，比 -나 보다 更主观。',
    conjugationRules: [
      { condition: '动词现在', formula: '词干 + -는 것 같아요', example: '오다 → 오는 것 같아요' },
      { condition: '形容词', formula: '词干 + -(으)ㄴ 것 같아요', example: '예쁘다 → 예쁜 것 같아요' },
      { condition: '过去', formula: '词干 + -(으)ㄴ 것 같아요', example: '갔던 것 같아요' },
    ],
    nuanceComparison: '-는 것 같다 是「我感觉好像」，-나 보다 是「看迹象应该是」，-는 모양이다 更书面。',
    examples: [
      {
        korean: '비가 오는 것 같아요.',
        spokenPronunciation: '[비가 오는 꺼 가타요]',
        chinese: '好像在下雨。',
      },
      {
        korean: '그 영화는 재미없는 것 같아요.',
        spokenPronunciation: '[그 영화는 재미엄는 꺼 가타요]',
        chinese: '那部电影好像没意思。',
      },
    ],
    challengePromptZh: '造句：他好像很累。',
    hintWords: [
      { kr: '피곤하다', zh: '累' },
      { kr: '그 사람', zh: '那个人' },
    ],
    sampleAnswerKr: '그 사람은 피곤한 것 같아요.',
  },
  {
    id: 'g2-na-boda',
    pattern: '-나 보다',
    titleZh: '推测「看来……」',
    level: 'TOPIK 2级',
    summary: '根据看到的迹象推断，比 -는 것 같다 更客观，常用于评论别人。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -나 봐요', example: '오다 → 오나 봐요' },
      { condition: '形容词/过去', formula: '词干 + -(으)ㄴ가 봐요', example: '바쁘다 → 바쁜가 봐요' },
    ],
    nuanceComparison: '「비가 오나 봐요」＝看来下雨了（看到有人撑伞）；「비가 오는 것 같아요」＝我觉得在下雨。',
    examples: [
      {
        korean: '사람이 많아 보여요. 인기 있나 봐요.',
        spokenPronunciation: '[사라미 마나 보여요. 인기 인나 봐요]',
        chinese: '人很多，看来很受欢迎。',
      },
      {
        korean: '아직 안 왔나 봐요.',
        spokenPronunciation: '[아직 안 왔나 봐요]',
        chinese: '看来还没来。',
      },
    ],
    challengePromptZh: '造句：看来他很忙。',
    hintWords: [
      { kr: '바쁘다', zh: '忙' },
      { kr: '요즘', zh: '最近' },
    ],
    sampleAnswerKr: '요즘 그 사람이 바쁜가 봐요.',
  },
];
