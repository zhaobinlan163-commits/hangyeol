import type { GrammarLesson } from '../types/learning';

/**
 * TOPIK 5-6 级补充语法包（21 条）
 * 补齐被动/使动、名词化、书面语与高级惯用表达。
 */
export const TOPIK_GRAMMAR_PACK_3: GrammarLesson[] = [
  {
    id: 'g4-passive',
    pattern: '-이/히/리/기- (被动)',
    titleZh: '被动语态「被……」',
    level: 'TOPIK 5-6级',
    summary: '通过在词干后加 -이/히/리/기 构成被动，表示主体「被」某个动作作用。',
    conjugationRules: [
      { condition: '-이-', formula: '쓰다 → 쓰이다 / 보다 → 보이다', example: '문이 열리다' },
      { condition: '-히-', formula: '먹다 → 먹히다 / 잡다 → 잡히다', example: '길이 막히다' },
      { condition: '-리-', formula: '팔다 → 팔리다 / 열다 → 열리다', example: '문이 열렸어요' },
      { condition: '-기-', formula: '끊다 → 끊기다 / 빼앗다 → 빼앗기다', example: '전기가 끊기다' },
    ],
    nuanceComparison: '被动句里原宾语变主语，用 -이/가：「문을 열었어요」(他开门) → 「문이 열렸어요」(门开了/被打开了)。',
    examples: [
      {
        korean: '갑자기 문이 열렸어요.',
        spokenPronunciation: '[갑자기 무니 열려써요]',
        chinese: '门突然被打开了。',
      },
      {
        korean: '그 영화는 많이 보여요.',
        spokenPronunciation: '[그 영화는 마니 보여요]',
        chinese: '那部电影很多人看。（被动形 보이다）',
      },
    ],
    challengePromptZh: '造句：路被堵住了。',
    hintWords: [
      { kr: '길', zh: '路' },
      { kr: '막다', zh: '堵' },
    ],
    sampleAnswerKr: '길이 막혔어요.',
  },
  {
    id: 'g4-causative',
    pattern: '-게 하다 (使动)',
    titleZh: '使动「让……做」',
    level: 'TOPIK 5-6级',
    summary: '让某人做某事，或使某种状态发生，主语是「促使者」。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -게 하다', example: '웃다 → 웃게 하다' },
      { condition: '形容词', formula: '词干 + -게 하다', example: '기쁘다 → 기쁘게 하다' },
    ],
    nuanceComparison: '-게 하다 是「让」；-도록 하다 是「使（通过安排）」，较正式；-아/어 주다 是「替对方做」。',
    examples: [
      {
        korean: '선생님이 학생을 웃게 했어요.',
        spokenPronunciation: '[선생니미 학생을 우게 해써요]',
        chinese: '老师让学生笑了。',
      },
      {
        korean: '그 말은 저를 슬프게 했어요.',
        spokenPronunciation: '[그 마른 저를 슬프게 해써요]',
        chinese: '那句话让我很难过。',
      },
    ],
    challengePromptZh: '造句：请让孩子早点睡。',
    hintWords: [
      { kr: '아이', zh: '孩子' },
      { kr: '일찍', zh: '早' },
      { kr: '자다', zh: '睡' },
    ],
    sampleAnswerKr: '아이가 일찍 자게 하세요.',
  },
  {
    id: 'g4-dorok-hada',
    pattern: '-도록 하다',
    titleZh: '安排「让／务必……」',
    level: 'TOPIK 5-6级',
    summary: '表示安排、指示或自我要求，比 -게 하다 更正式，常用于通知和劝导。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -도록 하다', example: '오다 → 오도록 하다' },
      { condition: '敬语', formula: '词干 + -시도록 하다', example: '오시도록 하다' },
    ],
    nuanceComparison: '「늦지 않도록 하세요」是「请注意别迟到」，语气介于命令和请求之间。',
    examples: [
      {
        korean: '내일까지 제출하도록 하세요.',
        spokenPronunciation: '[내일까지 제출하도록 하세요]',
        chinese: '请在明天之前提交。',
      },
      {
        korean: '앞으로 조심하도록 하겠습니다.',
        spokenPronunciation: '[아프로 조심하도록 하겓씀니다]',
        chinese: '以后我会注意的。',
      },
    ],
    challengePromptZh: '造句：请尽量不要迟到。',
    hintWords: [
      { kr: '늦다', zh: '迟到' },
      { kr: '가능하면', zh: '尽可能' },
    ],
    sampleAnswerKr: '가능하면 늦지 않도록 하세요.',
  },
  {
    id: 'g4-eum-nominal',
    pattern: '-(으)ㅁ (名词化)',
    titleZh: '把动词变成名词「……这件事」',
    level: 'TOPIK 5-6级',
    summary: '书面语名词化，常用于公告、标题、正式说明，如「모집함」「알림」。',
    conjugationRules: [
      { condition: '有收音', formula: '词干 + -음', example: '죽다 → 죽음' },
      { condition: '无收音', formula: '词干 + -ㅁ', example: '사랑하다 → 사랑함' },
    ],
    nuanceComparison: '-기 是口语化的名词化（하기가 싫어요），-(으)ㅁ 更书面（그의 죽음을 슬퍼하다）。',
    examples: [
      {
        korean: '이번 주는 휴무임을 알려 드립니다.',
        spokenPronunciation: '[이번 주는 휴무이믈 알려 드림니다]',
        chinese: '通知：本周休息。',
      },
      {
        korean: '건강을 위해 금연함이 좋겠습니다.',
        spokenPronunciation: '[건강을 위해 금연하미 조켓씀니다]',
        chinese: '为了健康，最好戒烟。',
      },
    ],
    challengePromptZh: '造句：请确认参加。（用书面名词化）',
    hintWords: [
      { kr: '참가', zh: '参加' },
      { kr: '확인', zh: '确认' },
    ],
    sampleAnswerKr: '참가 여부를 확인하심이 좋겠습니다.',
  },
  {
    id: 'g4-gi-nominal',
    pattern: '-기 (名词化)',
    titleZh: '口语名词化「……（这件事）」',
    level: 'TOPIK 5-6级',
    summary: '把动词变成名词，常接 좋다/싫다/어렵다/쉽다，也用于「-기가 -기」对比。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -기', example: '읽다 → 읽기' },
      { condition: '常用', formula: '-기가 좋다/싫다/쉽다/어렵다', example: '배우기 쉽다' },
    ],
    nuanceComparison: '「한국어 배우기가 어려워요」自然；「배움을 어려워요」不自然——-기 才能直接接形容词评价。',
    examples: [
      {
        korean: '한국어 발음하기가 어려워요.',
        spokenPronunciation: '[한구거 바르마기카 어려워요]',
        chinese: '韩语发音很难。',
      },
      {
        korean: '여기서 사진 찍기가 안 돼요.',
        spokenPronunciation: '[여기서 사진 찌끼가 안 돼요]',
        chinese: '这里不能拍照。',
      },
    ],
    challengePromptZh: '造句：早起很难。',
    hintWords: [
      { kr: '일찍', zh: '早' },
      { kr: '일어나다', zh: '起床' },
      { kr: '힘들다', zh: '吃力' },
    ],
    sampleAnswerKr: '일찍 일어나기가 힘들어요.',
  },
  {
    id: 'g4-neun-ba',
    pattern: '-는 바',
    titleZh: '书面「所……的（内容）」',
    level: 'TOPIK 5-6级',
    summary: '正式书面语，用来引出说明或依据，常见于公文、合同、报道。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 바', example: '알리는 바와 같이' },
      { condition: '过去', formula: '词干 + -(으)ㄴ 바', example: '말씀하신 바' },
    ],
    nuanceComparison: '口语几乎不用；-는 바 后面常接 와/에 따라。「아는 바와 같이」＝如大家所知。',
    examples: [
      {
        korean: '아는 바와 같이 이번 시험은 어려웠습니다.',
        spokenPronunciation: '[아는 바와 가치 이번 시험은 어려웠씀니다]',
        chinese: '如大家所知，这次考试很难。',
      },
      {
        korean: '조사한 바에 따르면 문제가 없습니다.',
        spokenPronunciation: '[조사한 바에 따르면 문제가 업씀니다]',
        chinese: '据调查，没有问题。',
      },
    ],
    challengePromptZh: '造句：据我所知，他还没来。',
    hintWords: [
      { kr: '알다', zh: '知道' },
      { kr: '아직', zh: '还' },
      { kr: '오다', zh: '来' },
    ],
    sampleAnswerKr: '제가 아는 바로는 그는 아직 오지 않았습니다.',
  },
  {
    id: 'g4-e-bulguwahada',
    pattern: '-에 불과하다',
    titleZh: '「不过是……」',
    level: 'TOPIK 5-6级',
    summary: '强调数量少或程度低，带轻微贬低或客观评价的书面表达。',
    conjugationRules: [
      { condition: '名词', formula: '名词 + 에 불과하다', example: '일부분에 불과하다' },
      { condition: '数量', formula: '수 + 에 불과하다', example: '10명에 불과하다' },
    ],
    nuanceComparison: '-에 지나지 않다 同义但更口语；-에 불과하다 更书面、更冷峻。',
    examples: [
      {
        korean: '이건 시작에 불과해요.',
        spokenPronunciation: '[이건 시자게 불과해요]',
        chinese: '这不过是开始。',
      },
      {
        korean: '참석자는 열 명에 불과했습니다.',
        spokenPronunciation: '[참석자는 열 명에 불과했씀니다]',
        chinese: '出席者不过十人。',
      },
    ],
    challengePromptZh: '造句：那不过是借口。',
    hintWords: [
      { kr: '변명', zh: '借口' },
    ],
    sampleAnswerKr: '그건 변명에 불과해요.',
  },
  {
    id: 'g4-eul-ppunida',
    pattern: '-(으)ㄹ 뿐이다',
    titleZh: '「只是……」',
    level: 'TOPIK 5-6级',
    summary: '限定范围，表示「只有这个，没有别的」，语气比 -만 更强调。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -(으)ㄹ 뿐이다', example: '기다릴 뿐이다' },
      { condition: '名词', formula: '名词 + 일 뿐이다', example: '실수일 뿐이다' },
    ],
    nuanceComparison: '「조금 늦었을 뿐이에요」＝只是稍微晚了点，没别的；「조금 늦었어요」没有这种辩解语气。',
    examples: [
      {
        korean: '저는 그저 최선을 다했을 뿐이에요.',
        spokenPronunciation: '[저는 그저 최서늘 다해쓸 뿌니에요]',
        chinese: '我只是尽了最大努力而已。',
      },
      {
        korean: '그건 오해일 뿐이에요.',
        spokenPronunciation: '[그건 오해일 뿌니에요]',
        chinese: '那只是误会。',
      },
    ],
    challengePromptZh: '造句：我只是想问一下。',
    hintWords: [
      { kr: '묻다', zh: '问' },
      { kr: '그냥', zh: '只是' },
    ],
    sampleAnswerKr: '그냥 물어봤을 뿐이에요.',
  },
  {
    id: 'g4-gi-nareum',
    pattern: '-기 나름이다',
    titleZh: '「取决于……」',
    level: 'TOPIK 5-6级',
    summary: '结果好坏取决于前面的做法或态度。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -기 나름이다', example: '하기 나름이다' },
      { condition: '常用', formula: 'N + 은/는 -기 나름이다', example: '생각하기 나름이다' },
    ],
    nuanceComparison: '-기 나름이다 强调主观努力决定结果；-에 달려 있다 更客观。',
    examples: [
      {
        korean: '인생은 생각하기 나름이에요.',
        spokenPronunciation: '[인생은 생각하기 나르미에요]',
        chinese: '人生取决于你怎么想。',
      },
      {
        korean: '결과는 노력하기 나름입니다.',
        spokenPronunciation: '[결과는 노력하기 나름임니다]',
        chinese: '结果取决于努力。',
      },
    ],
    challengePromptZh: '造句：幸福取决于自己。',
    hintWords: [
      { kr: '행복', zh: '幸福' },
      { kr: '자기', zh: '自己' },
    ],
    sampleAnswerKr: '행복은 자기 하기 나름이에요.',
  },
  {
    id: 'g4-neun-saemida',
    pattern: '-는 셈이다',
    titleZh: '「等于说……」',
    level: 'TOPIK 5-6级',
    summary: '根据前面的事实推断出「等于、算是」某种结论。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 셈이다', example: '다 가는 셈이다' },
      { condition: '形容词', formula: '词干 + -(으)ㄴ 셈이다', example: '비싼 셈이다' },
    ],
    nuanceComparison: '-는 셈이다 是「就算是这样」；-는 거예요 是陈述事实。',
    examples: [
      {
        korean: '거의 다 온 셈이에요.',
        spokenPronunciation: '[거의 다 온 세미에요]',
        chinese: '差不多都来了。',
      },
      {
        korean: '그럼 제가 손해를 본 셈이네요.',
        spokenPronunciation: '[그럼 제가 손해를 본 세미네요]',
        chinese: '那等于我吃亏了。',
      },
    ],
    challengePromptZh: '造句：这样的话，等于白做了。',
    hintWords: [
      { kr: '그럼', zh: '那么' },
      { kr: '헛수고', zh: '白费功夫' },
    ],
    sampleAnswerKr: '그럼 헛수고한 셈이네요.',
  },
  {
    id: 'g4-su-bakke-eopda',
    pattern: '-(으)ㄹ 수밖에 없다',
    titleZh: '「只能……」',
    level: 'TOPIK 5-6级',
    summary: '表示除了这样做别无选择，带无奈或必然的语感。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -(으)ㄹ 수밖에 없다', example: '갈 수밖에 없다' },
      { condition: '否定', formula: '-(으)ㄹ 수밖에 없다', example: '안 할 수밖에 없다' },
    ],
    nuanceComparison: '-아/어야 한다 是「应该做」，-수밖에 없다 是「没别的办法只能做」。',
    examples: [
      {
        korean: '버스가 없어서 걸어갈 수밖에 없어요.',
        spokenPronunciation: '[버스가 업써서 거러갈 수바께 업써요]',
        chinese: '没公交，只能走着去。',
      },
      {
        korean: '이렇게밖에 할 수 없어요.',
        spokenPronunciation: '[이러케바께 할 수 업써요]',
        chinese: '只能这样做。',
      },
    ],
    challengePromptZh: '造句：只能等到明天了。',
    hintWords: [
      { kr: '내일', zh: '明天' },
      { kr: '기다리다', zh: '等' },
    ],
    sampleAnswerKr: '내일까지 기다릴 수밖에 없어요.',
  },
  {
    id: 'g4-neun-isang',
    pattern: '-(으)ㄴ/는 이상',
    titleZh: '「既然……」',
    level: 'TOPIK 5-6级',
    summary: '既然已经到了这个地步，就理所当然要承担后面的结果，后半句多为义务或决心。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 이상', example: '하는 이상' },
      { condition: '形容词/过去', formula: '词干 + -(으)ㄴ 이상', example: '결심한 이상' },
    ],
    nuanceComparison: '-니까 是普通因果；-는 이상 语气更硬，后面常跟 -아/어야 한다。',
    examples: [
      {
        korean: '시작한 이상 끝까지 해야 해요.',
        spokenPronunciation: '[시작한 이싱 끄찌가 해야 해요]',
        chinese: '既然开始了，就得做到底。',
      },
      {
        korean: '약속한 이상 지켜야죠.',
        spokenPronunciation: '[약쏙한 이싱 지켜야죠]',
        chinese: '既然答应了，就该守约。',
      },
    ],
    challengePromptZh: '造句：既然来了，就一起做吧。',
    hintWords: [
      { kr: '오다', zh: '来' },
      { kr: '같이', zh: '一起' },
    ],
    sampleAnswerKr: '온 이상 같이 하죠.',
  },
  {
    id: 'g4-neun-tong-e',
    pattern: '-는 통에',
    titleZh: '「因为（混乱的）……所以」',
    level: 'TOPIK 5-6级',
    summary: '因为前面这种混乱或突发的状况，导致后面不好的结果。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 통에', example: '떠드는 통에' },
      { condition: '名词', formula: '名词 + 통에', example: '소란 통에' },
    ],
    nuanceComparison: '-는 바람에 也是负面原因，但 -는 통에 更强调「乱哄哄的场面」。',
    examples: [
      {
        korean: '옆 사람이 떠드는 통에 못 들었어요.',
        spokenPronunciation: '[옆 싸라미 떠드는 통에 모 드러써요]',
        chinese: '旁边的人吵吵嚷嚷，没听见。',
      },
      {
        korean: '갑자기 비가 오는 통에 옷이 다 젖었어요.',
        spokenPronunciation: '[갑자기 비가 오는 통에 오시 다 저저써요]',
        chinese: '突然下雨，衣服全湿了。',
      },
    ],
    challengePromptZh: '造句：因为太吵，没睡着。',
    hintWords: [
      { kr: '시끄럽다', zh: '吵' },
      { kr: '자다', zh: '睡' },
    ],
    sampleAnswerKr: '시끄러운 통에 잠을 못 잤어요.',
  },
  {
    id: 'g4-neuni',
    pattern: '-느니 (차라리)',
    titleZh: '「与其……不如……」',
    level: 'TOPIK 5-6级',
    summary: '两者都比较后，认为后者更好，常与 차라리 搭配。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -느니', example: '듣느니' },
      { condition: '常用', formula: '-느니 차라리 -는 게 낫다', example: '기다리느니 차라리 갈래요' },
    ],
    nuanceComparison: '-보다 是比较；-느니 是对两个都不满意的选项做取舍。',
    examples: [
      {
        korean: '여기서 기다리느니 차라리 걸어갈래요.',
        spokenPronunciation: '[여기서 기다리느니 차라리 거러갈래요]',
        chinese: '与其在这儿等，不如走过去。',
      },
      {
        korean: '듣기만 하느니 직접 해 보는 게 낫겠어요.',
        spokenPronunciation: '[듣끼만 하느니 직쩝 해 보는 게 낫께써요]',
        chinese: '与其光听，不如自己试试。',
      },
    ],
    challengePromptZh: '造句：与其抱怨，不如行动。',
    hintWords: [
      { kr: '불평하다', zh: '抱怨' },
      { kr: '행동하다', zh: '行动' },
    ],
    sampleAnswerKr: '불평하느니 차라리 행동하는 게 낫겠어요.',
  },
  {
    id: 'g4-goja',
    pattern: '-고자',
    titleZh: '书面目的「为了……」',
    level: 'TOPIK 5-6级',
    summary: '正式书面语的目的表达，常见于演讲、公文、新闻。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -고자', example: '말하고자' },
      { condition: '名词', formula: '名词 + 을/를 위해', example: '위해' },
    ],
    nuanceComparison: '-고자 后不能接命令或劝诱（-고자 하세요 X）；口语用 -(으)려고。',
    examples: [
      {
        korean: '여러분께 한 가지 말씀드리고자 합니다.',
        spokenPronunciation: '[여러분께 한 가지 말씀드리고자 함니다]',
        chinese: '我想向大家说一件事。',
      },
      {
        korean: '이 문제를 해결하고자 노력했습니다.',
        spokenPronunciation: '[이 문제를 해결하고자 노력했씀니다]',
        chinese: '为了解决问题努力过了。',
      },
    ],
    challengePromptZh: '造句：为了学习韩语，我来了韩国。',
    hintWords: [
      { kr: '한국어', zh: '韩语' },
      { kr: '한국', zh: '韩国' },
      { kr: '오다', zh: '来' },
    ],
    sampleAnswerKr: '한국어를 배우고자 한국에 왔습니다.',
  },
  {
    id: 'g4-myeo',
    pattern: '-(으)며',
    titleZh: '书面并列「并且／同时」',
    level: 'TOPIK 5-6级',
    summary: '-고 的书面形式，并列两个动作或状态，也常用于列举。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -(으)며', example: '공부하며' },
      { condition: '形容词', formula: '词干 + -(으)며', example: '아름다우며' },
    ],
    nuanceComparison: '-며 可表示同时进行（음악을 들으며 공부해요）；-고 只表示并列，不强调同时。',
    examples: [
      {
        korean: '음악을 들으며 공부해요.',
        spokenPronunciation: '[으마글 드르며 공부해요]',
        chinese: '边听音乐边学习。',
      },
      {
        korean: '이 도시는 조용하며 깨끗합니다.',
        spokenPronunciation: '[이 도시는 조용하며 깨끄탐니다]',
        chinese: '这座城市安静又干净。',
      },
    ],
    challengePromptZh: '造句：她笑着说了谢谢。',
    hintWords: [
      { kr: '웃다', zh: '笑' },
      { kr: '감사하다', zh: '感谢' },
    ],
    sampleAnswerKr: '그분은 웃으며 감사하다고 말했습니다.',
  },
  {
    id: 'g4-gineun-keonyeong',
    pattern: '-기는커녕',
    titleZh: '「别说……连……都」',
    level: 'TOPIK 5-6级',
    summary: '先否定前项（别说 A 了），进一步强调后项更不可能或更糟。',
    conjugationRules: [
      { condition: '动词/形容词', formula: '词干 + -기는커녕', example: '사기는커녕' },
      { condition: '名词', formula: '名词 + 은/는커녕', example: '밥은커녕' },
    ],
    nuanceComparison: '语气比 -도 更强烈，常带抱怨：밥은커녕 물도 못 마셨어요（别说饭，连水都没喝上）。',
    examples: [
      {
        korean: '칭찬은커녕 야단만 맞았어요.',
        spokenPronunciation: '[칭차는커녕 야단만 마자써요]',
        chinese: '别说表扬了，只挨了骂。',
      },
      {
        korean: '쉬기는커녕 더 바빠졌어요.',
        spokenPronunciation: '[쉬기는커녕 더 바빠저써요]',
        chinese: '别说休息，更忙了。',
      },
    ],
    challengePromptZh: '造句：别说旅游，连周末都没有。',
    hintWords: [
      { kr: '여행', zh: '旅游' },
      { kr: '주말', zh: '周末' },
    ],
    sampleAnswerKr: '여행은커녕 주말도 없어요.',
  },
  {
    id: 'g4-neun-dedaga',
    pattern: '-는 데다가',
    titleZh: '递进「不但……而且」',
    level: 'TOPIK 5-6级',
    summary: '在前项基础上再叠加一层（多为同类），语气比 -뿐만 아니라 更口语。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 데다가', example: '비가 오는 데다가' },
      { condition: '形容词', formula: '词干 + -(으)ㄴ 데다가', example: '비싼 데다가' },
    ],
    nuanceComparison: '-는 데다가 叠加同类信息；-뿐만 아니라 更强调「不止」；-는 데다가 后句常是负面叠加。',
    examples: [
      {
        korean: '비가 오는 데다가 바람까지 불어요.',
        spokenPronunciation: '[비가 오는 데다가 바람까지 부러요]',
        chinese: '不但下雨，还刮风。',
      },
      {
        korean: '값이 비싼 데다가 맛도 없어요.',
        spokenPronunciation: '[갑씨 비싼 데다가 마또 업써요]',
        chinese: '不但贵，还不好吃。',
      },
    ],
    challengePromptZh: '造句：不但下雨，还冷。',
    hintWords: [
      { kr: '비', zh: '雨' },
      { kr: '춥다', zh: '冷' },
    ],
    sampleAnswerKr: '비가 오는 데다가 추워요.',
  },
  {
    id: 'g4-euljieonjeong',
    pattern: '-(으)ㄹ지언정',
    titleZh: '「宁可……也绝不」',
    level: 'TOPIK 5-6级',
    summary: '宁可选择前项，也绝不做后项，语气强烈，书面/演讲常用。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -(으)ㄹ지언정', example: '죽을지언정' },
      { condition: '常用', formula: '-(으)ㄹ지언정 -지는 않겠다', example: '거짓말할지언정' },
    ],
    nuanceComparison: '-더라도 是「即使……也」，-을지언정 是「宁可……也绝不」，态度更强。',
    examples: [
      {
        korean: '굶을지언정 남의 것을 훔치지는 않겠다.',
        spokenPronunciation: '[구믈지언정 나머 거슬 훔치지는 안겓따]',
        chinese: '宁可饿着，也绝不偷别人的东西。',
      },
      {
        korean: '늦을지언정 거짓말은 안 해요.',
        spokenPronunciation: '[느즐지언정 거짓마른 안 해요]',
        chinese: '宁可迟到，也不说谎。',
      },
    ],
    challengePromptZh: '造句：宁可累，也不放弃。',
    hintWords: [
      { kr: '힘들다', zh: '累' },
      { kr: '포기하다', zh: '放弃' },
    ],
    sampleAnswerKr: '힘들지언정 포기하지는 않겠어요.',
  },
  {
    id: 'g4-neun-han',
    pattern: '-는 한',
    titleZh: '「只要……就」',
    level: 'TOPIK 5-6级',
    summary: '表示只要前项状态持续，后项就成立，书面语。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -는 한', example: '사는 한' },
      { condition: '形容词', formula: '词干 + -(으)ㄴ 한', example: '건강한 한' },
    ],
    nuanceComparison: '-는 한 后面常接 가능/불가능判断：내가 있는 한 괜찮아요。',
    examples: [
      {
        korean: '제가 있는 한 걱정하지 마세요.',
        spokenPronunciation: '[제가 이는 한 걱쩡하지 마세요]',
        chinese: '只要我在，就别担心。',
      },
      {
        korean: '건강한 한 계속 일할 수 있어요.',
        spokenPronunciation: '[건강한 한 계속 일할 수 이써요]',
        chinese: '只要健康，就能继续工作。',
      },
    ],
    challengePromptZh: '造句：只要努力，就有可能。',
    hintWords: [
      { kr: '노력하다', zh: '努力' },
      { kr: '가능하다', zh: '可能' },
    ],
    sampleAnswerKr: '노력하는 한 가능성이 있어요.',
  },
  {
    id: 'g4-gi-ilssu',
    pattern: '-기 일쑤이다',
    titleZh: '「动不动就……」',
    level: 'TOPIK 5-6级',
    summary: '表示某事频繁发生（多为负面），带责备或无奈。',
    conjugationRules: [
      { condition: '动词', formula: '词干 + -기 일쑤이다', example: '잊어버리기 일쑤이다' },
      { condition: '常用', formula: 'N + 하기 일쑤이다', example: '지각하기 일쑤이다' },
    ],
    nuanceComparison: '-기 십상이다 是「很容易（变成那样）」，-기 일쑤이다 是「经常、动不动就」，后者强调频率。',
    examples: [
      {
        korean: '요즘은 지각하기 일쑤예요.',
        spokenPronunciation: '[요즈믄 지각하기 일쑤예요]',
        chinese: '最近动不动就迟到。',
      },
      {
        korean: '이런 실수는 하기 일쑤예요.',
        spokenPronunciation: '[이런 실수는 하기 일쑤예요]',
        chinese: '这种失误是常有的。',
      },
    ],
    challengePromptZh: '造句：他动不动就忘东西。',
    hintWords: [
      { kr: '잊어버리다', zh: '忘记' },
      { kr: '물건', zh: '东西' },
    ],
    sampleAnswerKr: '그는 물건을 잊어버리기 일쑤예요.',
  },
];
