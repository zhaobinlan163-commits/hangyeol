import type { GrammarLesson } from '../types/learning';

/**
 * TOPIK 3-4 级补充语法包（24 条）
 * 补齐连接词尾、间接引语、比较与时间关系等中级核心。
 */
export const TOPIK_GRAMMAR_PACK_2: GrammarLesson[] = [
  {
    id: 'g3-daga',
    pattern: '-다가',
    titleZh: '动作中断与转换「……着……着」',
    level: 'TOPIK 3-4级',
    summary: '前一个动作进行到一半，转而做另一个动作，或中途停止、发生意外。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -다가', example: '가다 → 가다가' },
      { condition: '常见搭配', formula: '-(으)ㄴ/는데 不适用', example: '걷다가 넘어졌어요' },
    ],
    nuanceComparison: '-다가 强调中途转换；-고 只是先后。-다가 后半句常是意外或相反的结果。',
    examples: [
      {
        korean: '집에 가다가 친구를 만났어요.',
        spokenPronunciation: '[지베 가다가 친구를 만나써요]',
        chinese: '回家路上遇到了朋友。',
      },
      {
        korean: '책을 읽다가 잠이 들었어요.',
        spokenPronunciation: '[채글 익따가 자미 드러써요]',
        chinese: '看着书就睡着了。',
      },
    ],
    challengePromptZh: '造句：走着走着摔倒了。',
    hintWords: [
      { kr: '걷다', zh: '走' },
      { kr: '넘어지다', zh: '摔倒' },
    ],
    sampleAnswerKr: '걷다가 넘어졌어요.',
  },
  {
    id: 'g3-jamaja',
    pattern: '-자마자',
    titleZh: '「一……就……」',
    level: 'TOPIK 3-4级',
    summary: '前一个动作刚结束，后一个动作立刻发生，时间间隔几乎为零。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -자마자', example: '도착하다 → 도착하자마자' },
      { condition: '注意', formula: '不能用于命令/劝诱句', example: '오자마자 가세요 (X)' },
    ],
    nuanceComparison: '-자마자 是「立刻就」，-고 나서 是「之后」。「집에 오자마자 잤어요」＝一到家就睡。',
    examples: [
      {
        korean: '수업이 끝나자마자 집에 갔어요.',
        spokenPronunciation: '[수오비 끄나자마자 지베 갔써요]',
        chinese: '一下课就回家了。',
      },
      {
        korean: '그 소식을 듣자마자 달려갔어요.',
        spokenPronunciation: '[그 소시글 듣짜마자 달려갔써요]',
        chinese: '一听到这个消息就赶过去了。',
      },
    ],
    challengePromptZh: '造句：一到家就下雨了。',
    hintWords: [
      { kr: '도착하다', zh: '到达' },
      { kr: '비가 오다', zh: '下雨' },
    ],
    sampleAnswerKr: '집에 도착하자마자 비가 왔어요.',
  },
  {
    id: 'g3-deoni',
    pattern: '-더니',
    titleZh: '回想与转折「以前……结果现在……」',
    level: 'TOPIK 3-4级',
    summary: '说话人回想自己亲眼看到的情况，紧接一个与之前相反或自然产生的结果。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -더니', example: '많이 먹다 → 많이 먹더니' },
      { condition: '状态', formula: '词干 + -았/었더니', example: '열심히 했더니' },
    ],
    nuanceComparison: '-더니 前后主语通常不同或形成对比；-아/어서 只是因果，没有「回想」意味。',
    examples: [
      {
        korean: '어제 많이 먹더니 오늘 배가 아프대요.',
        spokenPronunciation: '[어제 마니 먹떠니 오늘 배가 아프대요]',
        chinese: '昨天吃那么多，听说今天肚子疼。',
      },
      {
        korean: '아침에는 맑더니 지금은 흐려요.',
        spokenPronunciation: '[아치메는 맑떠니 지그믄 흐려요]',
        chinese: '早上还晴朗，现在阴了。',
      },
    ],
    challengePromptZh: '造句：以前他很瘦，现在胖了。',
    hintWords: [
      { kr: '날씬하다', zh: '苗条' },
      { kr: '뚱뚱하다', zh: '胖' },
    ],
    sampleAnswerKr: '예전에는 날씬하더니 지금은 뚱뚱해졌어요.',
  },
  {
    id: 'g3-neundedo',
    pattern: '-(으)ㄴ/는데도',
    titleZh: '让步「尽管……却……」',
    level: 'TOPIK 3-4级',
    summary: '承认前面的事实，但结果与预期相反，语气比 -지만 更强。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는데도', example: '오다 → 오는데도' },
      { condition: '形容词', formula: '词干 + -(으)ㄴ데도', example: '바쁘다 → 바쁜데도' },
    ],
    nuanceComparison: '-지만 中性转折，-는데도 带不满或意外（비가 오는데도 우산을 안 가져왔어요）。',
    examples: [
      {
        korean: '비가 오는데도 우산을 안 가져왔어요.',
        spokenPronunciation: '[비가 오는데도 우사늘 안 가져와써요]',
        chinese: '尽管下雨，还是没带伞。',
      },
      {
        korean: '피곤한데도 끝까지 했어요.',
        spokenPronunciation: '[피곤한데도 끄찌가 해써요]',
        chinese: '虽然很累，还是坚持做完了。',
      },
    ],
    challengePromptZh: '造句：尽管很忙，他还是来了。',
    hintWords: [
      { kr: '바쁘다', zh: '忙' },
      { kr: '오다', zh: '来' },
    ],
    sampleAnswerKr: '바쁜데도 그는 왔어요.',
  },
  {
    id: 'g3-dorok',
    pattern: '-도록',
    titleZh: '目的·程度「为了……／到……的程度」',
    level: 'TOPIK 3-4级',
    summary: '表示目的（使得……）或程度（到……的地步），也用于命令句的间接表达。',
    conjugationRules: [
      { condition: '目的', formula: '词干 + -도록', example: '잊지 않도록' },
      { condition: '程度', formula: '词干 + -도록', example: '눈물이 나도록' },
    ],
    nuanceComparison: '-도록 后面常接 -하세요（잊지 않도록 하세요），-게 更侧重结果状态。',
    examples: [
      {
        korean: '잊지 않도록 메모해 두세요.',
        spokenPronunciation: '[잊찌 안토록 메모해 두세요]',
        chinese: '请记下来，免得忘记。',
      },
      {
        korean: '목이 아프도록 말했어요.',
        spokenPronunciation: '[모기 아프토록 말해써요]',
        chinese: '说到嗓子都疼了。',
      },
    ],
    challengePromptZh: '造句：请早点到，别迟到。',
    hintWords: [
      { kr: '늦다', zh: '迟到' },
      { kr: '일찍', zh: '早' },
    ],
    sampleAnswerKr: '늦지 않도록 일찍 오세요.',
  },
  {
    id: 'g3-meuro',
    pattern: '-므로',
    titleZh: '书面因果「因为……」',
    level: 'TOPIK 3-4级',
    summary: '正式的因果连接，常用于通知、说明文、新闻，口语里用 -아/어서 更自然。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -므로', example: '비가 오므로' },
      { condition: '名词', formula: '名词 + 이므로', example: '학생이므로' },
    ],
    nuanceComparison: '-므로 后面不能接命令句（-세요），这点和 -아/어서 一样；书面语用 -므로，口语用 -니까。',
    examples: [
      {
        korean: '오늘은 비가 오므로 우산을 준비하시기 바랍니다.',
        spokenPronunciation: '[오느른 비가 오므로 우사늘 준비하시기 바람니다]',
        chinese: '今天有雨，请准备雨伞。（公告体）',
      },
      {
        korean: '그는 학생이므로 할인이 됩니다.',
        spokenPronunciation: '[그는 학생이므로 하리니 됨니다]',
        chinese: '因为他是学生，所以可以打折。',
      },
    ],
    challengePromptZh: '造句：因为明天是周末，所以休息。',
    hintWords: [
      { kr: '주말', zh: '周末' },
      { kr: '쉬다', zh: '休息' },
    ],
    sampleAnswerKr: '내일은 주말이므로 쉽니다.',
  },
  {
    id: 'g3-neurago',
    pattern: '-느라고',
    titleZh: '「因为忙着做……所以（没做成别的）」',
    level: 'TOPIK 3-4级',
    summary: '说明因为忙于前面的动作，导致后面出现了负面结果；前后主语必须相同。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -느라고', example: '준비하다 → 준비하느라고' },
      { condition: '注意', formula: '不能接命令/劝诱', example: '공부하느라고 하세요 (X)' },
    ],
    nuanceComparison: '-느라고 只用于不利结果；-아/어서 中性。且 -느라고 前不能加时制词尾（-았느라고 X）。',
    examples: [
      {
        korean: '전화를 받느라고 문을 못 열었어요.',
        spokenPronunciation: '[전화를 받느라고 무늘 모 트러써요]',
        chinese: '光顾着接电话，没顾上开门。',
      },
      {
        korean: '준비하느라고 잠을 못 잤어요.',
        spokenPronunciation: '[준비하느라고 자믈 모 자써요]',
        chinese: '忙着准备，没睡好。',
      },
    ],
    challengePromptZh: '造句：忙着聊天，错过了公交车。',
    hintWords: [
      { kr: '이야기하다', zh: '聊天' },
      { kr: '버스', zh: '公交' },
      { kr: '놓치다', zh: '错过' },
    ],
    sampleAnswerKr: '이야기하느라고 버스를 놓쳤어요.',
  },
  {
    id: 'g3-gillae',
    pattern: '-길래',
    titleZh: '「因为看到／听说……所以」',
    level: 'TOPIK 3-4级',
    summary: '根据自己看到或听到的情况做出反应，后半句常是询问、请求或行动。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -길래', example: '오다 → 오길래' },
      { condition: '过去', formula: '词干 + -았/었길래', example: '먹었길래' },
    ],
    nuanceComparison: '-길래 强调「因为看到那个情况」；-아/어서 只是因果，没有观察意味。',
    examples: [
      {
        korean: '비가 오길래 우산을 챙겼어요.',
        spokenPronunciation: '[비가 오길래 우사늘 챙겨써요]',
        chinese: '看到下雨，就带了伞。',
      },
      {
        korean: '맛있어 보이길래 하나 샀어요.',
        spokenPronunciation: '[마시써 보이길래 하나 사써요]',
        chinese: '看着好吃，就买了一个。',
      },
    ],
    challengePromptZh: '造句：看他很着急，我就帮了忙。',
    hintWords: [
      { kr: '급하다', zh: '着急' },
      { kr: '돕다', zh: '帮助' },
    ],
    sampleAnswerKr: '급해 보이길래 도와줬어요.',
  },
  {
    id: 'g3-gineun-hajiman',
    pattern: '-기는 하지만',
    titleZh: '先承认再转折「……是……但是」',
    level: 'TOPIK 3-4级',
    summary: '先部分承认前面的内容，再说出相反的判断，语气比 -지만 更委婉。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -기는 하지만', example: '좋다 → 좋기는 하지만' },
      { condition: '名词', formula: '名词 + 이기는 하지만', example: '학생이기는 하지만' },
    ],
    nuanceComparison: '-기는 하지만 有「话虽如此」的让步感；-지만 更直接。',
    examples: [
      {
        korean: '맛있기는 하지만 조금 비싸요.',
        spokenPronunciation: '[마시끼는 하지민 조금 비싸요]',
        chinese: '好吃是好吃，就是有点贵。',
      },
      {
        korean: '알기는 하지만 자세히는 몰라요.',
        spokenPronunciation: '[알기는 하지민 자세히는 몰라요]',
        chinese: '知道是知道，但不太清楚细节。',
      },
    ],
    challengePromptZh: '造句：有意思是有意思，但是太难了。',
    hintWords: [
      { kr: '재미있다', zh: '有意思' },
      { kr: '어렵다', zh: '难' },
    ],
    sampleAnswerKr: '재미있기는 하지만 너무 어려워요.',
  },
  {
    id: 'g3-deorado',
    pattern: '-더라도',
    titleZh: '让步「即使……也」',
    level: 'TOPIK 3-4级',
    summary: '假设极端情况，表示「就算……也照样」，语气比 -아/어도 更强。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -더라도', example: '비가 오더라도' },
      { condition: '名词', formula: '名词 + 이더라도', example: '학생이더라도' },
    ],
    nuanceComparison: '-더라도 是极端假设（即使下刀子也要去），-아/어도 一般让步（下雨也去）。',
    examples: [
      {
        korean: '아무리 바쁘더라도 식사는 하세요.',
        spokenPronunciation: '[아무리 바쁘더라도 식사는 하세요]',
        chinese: '再忙也要吃饭。',
      },
      {
        korean: '돈이 없더라도 행복할 수 있어요.',
        spokenPronunciation: '[도니 업떠라도 행보칼 수 이써요]',
        chinese: '就算没钱也能幸福。',
      },
    ],
    challengePromptZh: '造句：即使下雨，比赛也会进行。',
    hintWords: [
      { kr: '비가 오다', zh: '下雨' },
      { kr: '경기', zh: '比赛' },
      { kr: '하다', zh: '进行' },
    ],
    sampleAnswerKr: '비가 오더라도 경기는 합니다.',
  },
  {
    id: 'g3-damyeon',
    pattern: '-다면',
    titleZh: '假设「如果……的话」',
    level: 'TOPIK 3-4级',
    summary: '对不太确定或与现实相反的假设，比 -(으)면 更委婉、更书面。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -다면', example: '가다 → 간다면' },
      { condition: '过去', formula: '词干 + -았/었더라면', example: '갔더라면' },
    ],
    nuanceComparison: '-(으)면 是日常条件假设；-다면 带「假如真的」的设想感，常用于愿望或反事实。',
    examples: [
      {
        korean: '제가 부자라면 세계 여행을 할 거예요.',
        spokenPronunciation: '[제가 부자라면 세계 여행을 할 꺼예요]',
        chinese: '如果我是富人，就去环游世界。',
      },
      {
        korean: '시간이 있다면 같이 커피 마실래요?',
        spokenPronunciation: '[시가니 이따면 가치 커피 마실래요?]',
        chinese: '如果有时间，一起喝咖啡吗？',
      },
    ],
    challengePromptZh: '造句：如果我是你，我会道歉。',
    hintWords: [
      { kr: '사과하다', zh: '道歉' },
      { kr: '너', zh: '你' },
    ],
    sampleAnswerKr: '내가 너라면 사과할 거야.',
  },
  {
    id: 'g3-dago-hada',
    pattern: '-다고 하다',
    titleZh: '间接引语「说……」',
    level: 'TOPIK 3-4级',
    summary: '转述别人的话（陈述句），也用于表达自己的想法或传闻。',
    conjugationRules: [
      { condition: '动词现在', formula: '词干 + -ㄴ/는다고 하다', example: '간다고 했어요' },
      { condition: '形容词', formula: '词干 + -다고 하다', example: '예쁘다고 했어요' },
      { condition: '过去', formula: '词干 + -았/었다고 하다', example: '갔다고 했어요' },
    ],
    nuanceComparison: '直接引语用「」加原句；间接引语要变词尾。-다고 하다 用于陈述，-냐고 用于疑问，-자고 用于劝诱，-라고 用于命令。',
    examples: [
      {
        korean: '친구가 내일 온다고 했어요.',
        spokenPronunciation: '[친구가 내일 온다고 해써요]',
        chinese: '朋友说明天来。',
      },
      {
        korean: '선생님이 이 책이 좋다고 하셨어요.',
        spokenPronunciation: '[선생니미 이 채기 조타고 하셔써요]',
        chinese: '老师说这本书好。',
      },
    ],
    challengePromptZh: '造句：他说他很忙。',
    hintWords: [
      { kr: '바쁘다', zh: '忙' },
      { kr: '말하다', zh: '说' },
    ],
    sampleAnswerKr: '그 사람이 바쁘다고 했어요.',
  },
  {
    id: 'g3-nyago-hada',
    pattern: '-냐고 하다',
    titleZh: '转述疑问「问……」',
    level: 'TOPIK 3-4级',
    summary: '转述别人的问题，动词用 -냐고，形容词用 -(으)냐고。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -냐고 하다', example: '가다 → 가냐고 했어요' },
      { condition: '形容词/名词', formula: '词干 + -(으)냐고 하다', example: '바쁘냐고' },
    ],
    nuanceComparison: '口语常缩成 -냬요（가냬요＝问我是不是去）。敬语对象用 -시냐고。',
    examples: [
      {
        korean: '어디에 가냐고 물어봤어요.',
        spokenPronunciation: '[어디에 가냐고 무러봐써요]',
        chinese: '问我这是去哪儿。',
      },
      {
        korean: '왜 늦었냐고 하셨어요.',
        spokenPronunciation: '[왜 느저써냐고 하셔써요]',
        chinese: '问我为什么迟到了。',
      },
    ],
    challengePromptZh: '造句：他问我什么时候来。',
    hintWords: [
      { kr: '언제', zh: '什么时候' },
      { kr: '오다', zh: '来' },
      { kr: '묻다', zh: '问' },
    ],
    sampleAnswerKr: '언제 오냐고 물었어요.',
  },
  {
    id: 'g3-jago-hada',
    pattern: '-자고 하다',
    titleZh: '转述劝诱「提议……」',
    level: 'TOPIK 3-4级',
    summary: '转述别人提出的建议或邀请，「跟我说一起……吧」。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -자고 하다', example: '가다 → 가자고 했어요' },
      { condition: '敬语', formula: '词干 + -(으)시자고 하다', example: '가시자고' },
    ],
    nuanceComparison: '口语缩成 -재요（가재요）。和 -자고 的原句「같이 가자」对应。',
    examples: [
      {
        korean: '친구가 같이 밥을 먹자고 했어요.',
        spokenPronunciation: '[친구가 가치 바블 먹짜고 해써요]',
        chinese: '朋友说一起吃饭吧。',
      },
      {
        korean: '내일 만나자고 했어요.',
        spokenPronunciation: '[내일 만나자고 해써요]',
        chinese: '他说明天见面吧。',
      },
    ],
    challengePromptZh: '造句：他提议周末一起去。',
    hintWords: [
      { kr: '주말', zh: '周末' },
      { kr: '같이', zh: '一起' },
    ],
    sampleAnswerKr: '주말에 같이 가자고 했어요.',
  },
  {
    id: 'g3-rago-hada',
    pattern: '-라고 하다',
    titleZh: '转述命令「让我／叫我……」',
    level: 'TOPIK 3-4级',
    summary: '转述别人下达的命令或请求，也用于名词判断的引用（-이라고）。',
    conjugationRules: [
      { condition: '命令', formula: '词干 + -(으)라고 하다', example: '가다 → 가라고 했어요' },
      { condition: '名词引用', formula: '名词 + -이라고 하다', example: '학생이라고 했어요' },
    ],
    nuanceComparison: '转述请求用 -아/어 달라고 하다：「도와달라고 했어요」（让我帮忙）。',
    examples: [
      {
        korean: '선생님이 조용히 하라고 했어요.',
        spokenPronunciation: '[선생니미 조용히 하라고 해써요]',
        chinese: '老师让安静。',
      },
      {
        korean: '저를 학생이라고 불러요.',
        spokenPronunciation: '[저를 학생이라고 불러요]',
        chinese: '他们叫我学生。',
      },
    ],
    challengePromptZh: '造句：妈妈让我早点回家。',
    hintWords: [
      { kr: '어머니', zh: '妈妈' },
      { kr: '일찍', zh: '早' },
      { kr: '집', zh: '家' },
    ],
    sampleAnswerKr: '어머니가 일찍 집에 오라고 하셨어요.',
  },
  {
    id: 'g3-daesin',
    pattern: '-(으)ㄴ/는 대신에',
    titleZh: '代替「不做……而是」',
    level: 'TOPIK 3-4级',
    summary: '用一件事替代另一件事，或作为补偿条件。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 대신에', example: '가다 → 가는 대신에' },
      { condition: '名词', formula: '名词 + 대신에', example: '커피 대신에 차' },
    ],
    nuanceComparison: '名词后用 대신에（不带 -ㄴ/는）；动词后用 -는 대신에。',
    examples: [
      {
        korean: '오늘은 운동하는 대신에 산책했어요.',
        spokenPronunciation: '[오느른 우농하는 대신에 산채캐써요]',
        chinese: '今天没运动，改成散步了。',
      },
      {
        korean: '커피 대신에 차를 마셔요.',
        spokenPronunciation: '[커피 대신에 차를 마셔요]',
        chinese: '不喝咖啡，喝茶。',
      },
    ],
    challengePromptZh: '造句：我代替朋友去了。',
    hintWords: [
      { kr: '친구', zh: '朋友' },
      { kr: '대신', zh: '代替' },
      { kr: '가다', zh: '去' },
    ],
    sampleAnswerKr: '친구 대신에 제가 갔어요.',
  },
  {
    id: 'g3-dongan',
    pattern: '-는 동안',
    titleZh: '「在……期间」',
    level: 'TOPIK 3-4级',
    summary: '表示一段时间内持续的状态或动作。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 동안', example: '자다 → 자는 동안' },
      { condition: '名词', formula: '名词 + 동안', example: '방학 동안' },
    ],
    nuanceComparison: '-는 동안 强调期间；-는 사이에 强调「期间内发生了某事」。',
    examples: [
      {
        korean: '제가 자는 동안 전화가 왔어요.',
        spokenPronunciation: '[제가 자는 동안 전화가 와써요]',
        chinese: '我睡觉的时候来了电话。',
      },
      {
        korean: '방학 동안 한국어를 공부했어요.',
        spokenPronunciation: '[방학 동안 한구거를 공부해써요]',
        chinese: '放假期间学了韩语。',
      },
    ],
    challengePromptZh: '造句：你等我的时候，请先吃。',
    hintWords: [
      { kr: '기다리다', zh: '等' },
      { kr: '먹다', zh: '吃' },
    ],
    sampleAnswerKr: '저를 기다리는 동안 먼저 드세요.',
  },
  {
    id: 'g3-gi-jeone',
    pattern: '-기 전에',
    titleZh: '「在……之前」',
    level: 'TOPIK 3-4级',
    summary: '表示前一个动作发生在后一个动作之前，前后主语可以不同。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -기 전에', example: '먹다 → 먹기 전에' },
      { condition: '名词', formula: '名词 + 전에', example: '수업 전에' },
    ],
    nuanceComparison: '前后主语不同也能用（제가 가기 전에 전화하세요）；但 -고 나서 要求同一主语。',
    examples: [
      {
        korean: '밥을 먹기 전에 손을 씻으세요.',
        spokenPronunciation: '[바블 먹끼 전에 소늘 씨으세요]',
        chinese: '吃饭前请洗手。',
      },
      {
        korean: '수업 전에 복습했어요.',
        spokenPronunciation: '[수업 전에 복쓰뱃써요]',
        chinese: '上课前复习了。',
      },
    ],
    challengePromptZh: '造句：出发前给我打电话。',
    hintWords: [
      { kr: '출발하다', zh: '出发' },
      { kr: '전화하다', zh: '打电话' },
    ],
    sampleAnswerKr: '출발하기 전에 전화해 주세요.',
  },
  {
    id: 'g3-eun-hu',
    pattern: '-(으)ㄴ 후에',
    titleZh: '「在……之后」',
    level: 'TOPIK 3-4级',
    summary: '表示前一个动作完成之后才发生后一个动作。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -(으)ㄴ 후에', example: '먹다 → 먹은 후에' },
      { condition: '名词', formula: '名词 + 후에', example: '식사 후에' },
    ],
    nuanceComparison: '-고 나서 更口语、更强调「做完」；-(으)ㄴ 후에 可书面可口语。',
    examples: [
      {
        korean: '식사 후에 약을 드세요.',
        spokenPronunciation: '[식싸 후에 야글 드세요]',
        chinese: '饭后请吃药。',
      },
      {
        korean: '숙제를 한 후에 게임을 했어요.',
        spokenPronunciation: '[숙쩨를 한 후에 게이믈 해써요]',
        chinese: '做完作业后打了游戏。',
      },
    ],
    challengePromptZh: '造句：下课后我去找你。',
    hintWords: [
      { kr: '수업', zh: '课' },
      { kr: '끝나다', zh: '结束' },
      { kr: '찾아가다', zh: '去找' },
    ],
    sampleAnswerKr: '수업이 끝난 후에 찾아갈게요.',
  },
  {
    id: 'g3-geona',
    pattern: '-거나',
    titleZh: '选择「或者……」',
    level: 'TOPIK 3-4级',
    summary: '连接两个动词或形容词，表示从中选一个；也可用 -거나 -거나。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -거나', example: '먹다 → 먹거나' },
      { condition: '形容词', formula: '词干 + -거나', example: '크거나 작거나' },
    ],
    nuanceComparison: '-거나 连接谓语，-나 连接名词（커피나 차）。',
    examples: [
      {
        korean: '주말에는 책을 읽거나 영화를 봐요.',
        spokenPronunciation: '[주마레는 채글 익꺼나 영화를 봐요]',
        chinese: '周末看看书或者看电影。',
      },
      {
        korean: '전화하거나 문자를 보내세요.',
        spokenPronunciation: '[전화하거나 문자를 보내세요]',
        chinese: '打电话或者发短信吧。',
      },
    ],
    challengePromptZh: '造句：坐地铁或者坐公交都可以。',
    hintWords: [
      { kr: '지하철', zh: '地铁' },
      { kr: '버스', zh: '公交' },
    ],
    sampleAnswerKr: '지하철을 타거나 버스를 타면 돼요.',
  },
  {
    id: 'g3-deunji',
    pattern: '-든지',
    titleZh: '任选「不管是……还是」',
    level: 'TOPIK 3-4级',
    summary: '列举两个以上的选项，表示无论哪个都可以；口语常缩成 -든。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -든지', example: '가든지 말든지' },
      { condition: '名词', formula: '名词 + -(이)든지', example: '커피든지 차든지' },
    ],
    nuanceComparison: '-든지 是「随便哪个」；-거나 是「或者」，语气更中性。',
    examples: [
      {
        korean: '커피든지 차든지 마음대로 하세요.',
        spokenPronunciation: '[커피든지 차든지 마으므대로 하세요]',
        chinese: '咖啡还是茶，随你。',
      },
      {
        korean: '가든지 말든지 알아서 하세요.',
        spokenPronunciation: '[가든지 말든지 아라서 하세요]',
        chinese: '去不去你自己决定。',
      },
    ],
    challengePromptZh: '造句：今天还是明天都可以。',
    hintWords: [
      { kr: '오늘', zh: '今天' },
      { kr: '내일', zh: '明天' },
    ],
    sampleAnswerKr: '오늘이든지 내일이든지 괜찮아요.',
  },
  {
    id: 'g3-boda',
    pattern: '-보다 (比较)',
    titleZh: '比较「比……」',
    level: 'TOPIK 3-4级',
    summary: '比较两个对象，A 比 B 更……；配合 더/덜 使用。',
    conjugationRules: [
      { condition: '名词', formula: 'A + 이/가 + B + 보다 + 더 + 形容词', example: '이게 저거보다 더 커요' },
      { condition: '常用搭配', formula: '보다 더 / 보다 덜', example: '생각보다' },
    ],
    nuanceComparison: '「A가 B보다 커요」和「B보다 A가 커요」都对，主题助词决定焦点。',
    examples: [
      {
        korean: '오늘이 어제보다 더 더워요.',
        spokenPronunciation: '[오느리 어제보다 더 더워요]',
        chinese: '今天比昨天更热。',
      },
      {
        korean: '생각보다 어렵지 않아요.',
        spokenPronunciation: '[생각보다 어렵찌 아나요]',
        chinese: '比想象的容易。',
      },
    ],
    challengePromptZh: '造句：地铁比公交快。',
    hintWords: [
      { kr: '지하철', zh: '地铁' },
      { kr: '버스', zh: '公交' },
      { kr: '빠르다', zh: '快' },
    ],
    sampleAnswerKr: '지하철이 버스보다 빨라요.',
  },
  {
    id: 'g3-cheoreom',
    pattern: '-처럼 / -같이',
    titleZh: '比喻「像……一样」',
    level: 'TOPIK 3-4级',
    summary: '把两个事物作比，-처럼 和 -같이 基本同义，-처럼 更常用。',
    conjugationRules: [
      { condition: '名词有收音', formula: '名词 + 처럼', example: '학생처럼' },
      { condition: '名词无收音', formula: '名词 + 처럼', example: '바보처럼' },
    ],
    nuanceComparison: '-처럼 直接跟名词；-같이 也可表示「和……一起」（친구같이 갔어요＝和朋友一起去了）。',
    examples: [
      {
        korean: '그는 배우처럼 멋있어요.',
        spokenPronunciation: '[그는 배우처럼 머시써요]',
        chinese: '他像演员一样帅。',
      },
      {
        korean: '아이처럼 웃어요.',
        spokenPronunciation: '[아이처럼 우서요]',
        chinese: '笑得像个孩子。',
      },
    ],
    challengePromptZh: '造句：她像老师一样亲切。',
    hintWords: [
      { kr: '선생님', zh: '老师' },
      { kr: '친절하다', zh: '亲切' },
    ],
    sampleAnswerKr: '그분은 선생님처럼 친절해요.',
  },
  {
    id: 'g3-jjeum',
    pattern: '-쯤',
    titleZh: '大约「……左右」',
    level: 'TOPIK 3-4级',
    summary: '表示数量或时间的大概，等于「大概、左右」。',
    conjugationRules: [
      { condition: '数量/时间', formula: '数量 + 쯤', example: '세 시쯤 / 열 명쯤' },
      { condition: '程度', formula: '词干 + -(으)ㄹ 쯤', example: '도착할 쯤' },
    ],
    nuanceComparison: '쯤 是「大概」；정도 更正式且可接「程度」含义（이 정도면 충분해요）。',
    examples: [
      {
        korean: '세 시쯤 만나요.',
        spokenPronunciation: '[세 시쯤 마나요]',
        chinese: '三点左右见吧。',
      },
      {
        korean: '열 명쯤 왔어요.',
        spokenPronunciation: '[열 명쯤 와써요]',
        chinese: '来了十个人左右。',
      },
    ],
    challengePromptZh: '造句：大概三十个人左右。',
    hintWords: [
      { kr: '서른 명', zh: '三十人' },
      { kr: '오다', zh: '来' },
    ],
    sampleAnswerKr: '서른 명쯤 왔어요.',
  },
  {
    id: 'g3-a-eo-yagetta',
    pattern: '-아/어야겠다',
    titleZh: '自我决心「得……了」',
    level: 'TOPIK 3-4级',
    summary: '说话人自己下决心或意识到必须做某事，常用于自言自语。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -아/어야겠다', example: '가다 → 가야겠다' },
      { condition: '形容词', formula: '词干 + -아/어야겠다', example: '피곤하다 → 피곤해야겠다 (不自然)' },
    ],
    nuanceComparison: '只用于第一人称的决心；对别人用 -아/어야 해요（你得……）。',
    examples: [
      {
        korean: '이제 슬슬 가야겠어요.',
        spokenPronunciation: '[이제 슬슬 가야게써요]',
        chinese: '我该走了。',
      },
      {
        korean: '내일은 일찍 일어나야겠다.',
        spokenPronunciation: '[내이른 일찍 이러나야겓따]',
        chinese: '明天得早点起。',
      },
    ],
    challengePromptZh: '造句：今天得早点睡。',
    hintWords: [
      { kr: '오늘', zh: '今天' },
      { kr: '일찍', zh: '早' },
      { kr: '자다', zh: '睡' },
    ],
    sampleAnswerKr: '오늘은 일찍 자야겠어요.',
  },
];
