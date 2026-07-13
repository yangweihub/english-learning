/**
 * Translation Service with IndexedDB caching.
 *
 * Provides sentence-level and batch translation with offline caching.
 * Currently uses a mock translation layer that can be replaced with a real
 * Translation API (Google Translate, DeepL, etc.) by swapping the
 * `callTranslationAPI` implementation.
 */

import {
  put,
  getByKey,
  STORE_NAMES,
  type CachedTranslation,
} from '../utils/db';

// ============================================================
// TranslationService Interface
// ============================================================

export interface TranslationService {
  translateSentence(sentence: string): Promise<string>;
  translateBatch(sentences: string[]): Promise<string[]>;
  getCachedTranslation(sentence: string): Promise<string | null>;
}

// ============================================================
// Error Messages
// ============================================================

const TRANSLATION_UNAVAILABLE = '翻译暂不可用';

// ============================================================
// Mock Translation API Layer
// ============================================================

/**
 * A dictionary of sample translations for common sentences (offline fallback).
 * Includes translations for all mock article sentences used in the app.
 */
const FALLBACK_TRANSLATIONS: Record<string, string> = {
  // Common sentences
  'Hello, world!': '你好，世界！',
  'The weather is nice today.': '今天天气很好。',
  'I am learning English.': '我正在学习英语。',
  'This is a test sentence.': '这是一个测试句子。',
  'The cat sat on the mat.': '猫坐在垫子上。',
  'She reads books every day.': '她每天都看书。',
  'Technology is changing the world.': '科技正在改变世界。',
  'Education is the key to success.': '教育是成功的关键。',
  'Practice makes perfect.': '熟能生巧。',
  'Knowledge is power.': '知识就是力量。',

  // Article Titles
  'Global Leaders Meet to Discuss Climate Action': '全球领导人会晤讨论气候行动',
  'Technology Companies Face New Regulatory Framework': '科技公司面临新的监管框架',
  'International Trade Agreements Reshape Global Commerce': '国际贸易协定重塑全球商业',
  'Space Exploration Milestone Achieved': '太空探索里程碑达成',
  'Healthcare Innovation Transforms Patient Care': '医疗创新改变患者护理',
  'The Impact of Social Media on Modern Communication': '社交媒体对现代传播的影响',
  'Renewable Energy: Powering the Future': '可再生能源：为未来提供动力',
  'The Art of Critical Thinking': '批判性思维的艺术',
  'Biodiversity Conservation Challenges': '生物多样性保护挑战',
  'The Evolution of Artificial Intelligence': '人工智能的演进',
  'How Animals Communicate': '动物如何交流',
  'The Water Cycle Explained': '水循环解析',
  'Famous Inventors and Their Creations': '著名发明家及其创造',
  'Healthy Eating Habits for Students': '学生健康饮食习惯',
  'Exploring the Solar System': '探索太阳系',
  'The Psychology of Learning': '学习心理学',
  'Environmental Protection in Daily Life': '日常生活中的环境保护',
  'Cultural Festivals Around the World': '世界各地的文化节日',
  'The Importance of Reading': '阅读的重要性',
  'Sports and Teamwork': '运动与团队合作',
  'My Family': '我的家庭',
  'Colors All Around Us': '我们身边的颜色',
  'Animals on the Farm': '农场里的动物',
  'Days of the Week': '一周的日子',
  'Fruits I Like': '我喜欢的水果',

  // Article Summaries
  'World leaders gathered at the United Nations to address escalating climate challenges and commit to new emission reduction targets.':
    '世界领导人聚集在联合国，应对日益严峻的气候挑战，并承诺新的减排目标。',
  'Major technology firms must adapt to comprehensive new regulations governing data privacy and artificial intelligence use.':
    '大型科技公司必须适应管理数据隐私和人工智能使用的全面新法规。',
  'New bilateral trade agreements between major economies are creating fresh opportunities and challenges for international businesses.':
    '主要经济体之间的新双边贸易协定正在为国际企业创造新的机遇和挑战。',
  'Scientists celebrate a historic achievement as a new spacecraft successfully completes its mission to collect samples from a distant asteroid.':
    '科学家们庆祝一项历史性成就——一艘新航天器成功完成从遥远小行星收集样本的任务。',
  'Breakthrough medical technologies and AI-powered diagnostics are revolutionizing healthcare delivery across multiple countries.':
    '突破性医疗技术和人工智能诊断正在革新多个国家的医疗服务。',
  'How digital platforms have fundamentally changed the way people interact and share information in contemporary society.':
    '数字平台如何从根本上改变了当代社会中人们互动和分享信息的方式。',
  'An exploration of how solar, wind, and other renewable energy sources are becoming increasingly viable alternatives to fossil fuels.':
    '探索太阳能、风能和其他可再生能源如何日益成为化石燃料的可行替代品。',
  'Understanding how to evaluate information, recognize logical fallacies, and form well-reasoned opinions in the information age.':
    '了解如何在信息时代评估信息、识别逻辑谬误并形成合理观点。',
  'Examining the threats to global biodiversity and the conservation strategies being employed to protect endangered species.':
    '审视全球生物多样性面临的威胁以及保护濒危物种的保护策略。',
  'Tracing the development of AI from early computing concepts to modern machine learning applications that shape our daily lives.':
    '追溯人工智能从早期计算概念到塑造日常生活的现代机器学习应用的发展历程。',
  'Discover the fascinating ways animals talk to each other using sounds, colors, and body language.':
    '发现动物通过声音、颜色和肢体语言互相交流的有趣方式。',
  'Learn about how water moves between the ocean, sky, and land in a never-ending cycle.':
    '了解水如何在海洋、天空和陆地之间以永不停歇的循环流动。',
  'Stories of brilliant inventors whose creations changed the world forever.':
    '那些创造改变了世界的杰出发明家们的故事。',
  'Simple tips and advice on how to eat well and stay healthy during school years.':
    '关于如何在学生时代吃得好、保持健康的简单建议。',
  'A journey through our solar system to meet the planets and learn interesting facts about each one.':
    '穿越太阳系的旅程，认识行星并了解每颗行星的有趣事实。',
  'Understanding how the brain learns and remembers information can help students study more effectively.':
    '了解大脑如何学习和记忆信息可以帮助学生更有效地学习。',
  'Practical ways everyone can contribute to protecting the environment through simple daily actions.':
    '每个人都可以通过简单的日常行动为保护环境做出贡献的实用方法。',
  'Exploring how different countries celebrate their unique traditions and festivals throughout the year.':
    '探索不同国家如何在全年庆祝其独特的传统和节日。',
  'How regular reading can improve vocabulary, expand knowledge, and develop empathy and critical thinking skills.':
    '经常阅读如何能提高词汇量、扩展知识并培养同理心和批判性思维能力。',
  'How participating in sports teaches valuable life skills including cooperation, leadership, and perseverance.':
    '参加运动如何教会宝贵的生活技能，包括合作、领导力和毅力。',
  'Learn English words about family members and how to talk about your family.':
    '学习关于家庭成员的英语单词以及如何谈论你的家庭。',
  'Discover the names of colors in English and where you can find them in nature.':
    '发现英语中颜色的名称以及在自然中哪里可以找到它们。',
  'Meet the animals that live on a farm and learn what sounds they make.':
    '认识住在农场里的动物并学习它们发出什么声音。',
  'Learn the seven days of the week in English and what activities you can do each day.':
    '学习英语中一周七天的名称以及每天可以做什么活动。',
  'Learn the English names of common fruits and how to say which ones you like.':
    '学习常见水果的英语名称以及如何表达你喜欢哪些。',

  // current-affairs: Global Leaders Meet to Discuss Climate Action
  'World leaders from over 190 countries convened at the United Nations headquarters in New York to discuss urgent climate action measures.':
    '来自190多个国家的世界领导人在纽约联合国总部召开会议，讨论紧迫的气候行动措施。',
  'The summit focused on achieving net-zero emissions by 2050 and increasing climate finance for developing nations.':
    '此次峰会的重点是在2050年前实现净零排放，并增加对发展中国家的气候融资。',
  'Several major economies announced new commitments to phase out coal power and invest in renewable energy infrastructure.':
    '几个主要经济体宣布了逐步淘汰煤电并投资可再生能源基础设施的新承诺。',
  'Environmental advocates praised the renewed sense of urgency while cautioning that pledges must translate into concrete policy changes.':
    '环保倡导者赞扬了这种重新产生的紧迫感，同时警告称承诺必须转化为具体的政策变化。',
  'The conference also highlighted the disproportionate impact of climate change on vulnerable communities.':
    '会议还强调了气候变化对脆弱社区造成的不成比例的影响。',

  // current-affairs: Technology Companies Face New Regulatory Framework
  'The European Union has introduced a comprehensive regulatory framework targeting major technology companies.':
    '欧盟推出了一项针对大型科技公司的综合监管框架。',
  'The new legislation addresses data privacy concerns, algorithmic transparency, and the responsible deployment of artificial intelligence systems.':
    '新立法涉及数据隐私问题、算法透明度以及人工智能系统的负责任部署。',
  'Companies will be required to conduct impact assessments before launching AI products that affect public decision-making.':
    '公司在推出影响公共决策的人工智能产品之前，将被要求进行影响评估。',
  'Industry representatives have expressed concern about compliance costs while consumer advocates welcome the stronger protections.':
    '行业代表对合规成本表示担忧，而消费者权益倡导者则欢迎更强有力的保护措施。',
  'The regulations are expected to influence similar legislation worldwide.':
    '预计这些法规将影响全球类似的立法。',

  // current-affairs: International Trade Agreements
  'Several significant bilateral trade agreements have been signed this month, reshaping the landscape of international commerce.':
    '本月签署了几项重要的双边贸易协定，重塑了国际贸易格局。',
  'The agreements reduce tariffs on manufactured goods and agricultural products while establishing new intellectual property protections.':
    '这些协议降低了制成品和农产品的关税，同时建立了新的知识产权保护措施。',
  'Economists predict these changes will boost GDP growth in participating nations by approximately two percent over the next decade.':
    '经济学家预测，这些变化将在未来十年内使参与国的GDP增长约2%。',
  'Small and medium enterprises stand to benefit from simplified customs procedures.':
    '中小企业将从简化的海关程序中受益。',
  'However, labor unions have raised concerns about potential job displacement in certain manufacturing sectors.':
    '然而，工会对某些制造业部门可能出现的就业流失表示担忧。',

  // current-affairs: Space Exploration
  'NASA scientists celebrated a historic milestone as the OSIRIS-REx spacecraft successfully returned samples from the asteroid Bennu to Earth.':
    'NASA科学家庆祝了一个历史性里程碑——OSIRIS-REx航天器成功将小行星贝努的样本带回地球。',
  'The mission, which took seven years to complete, is expected to provide crucial insights into the formation of our solar system.':
    '这项耗时七年完成的任务预计将为我们了解太阳系的形成提供关键信息。',
  'The collected materials may contain organic molecules that could help explain the origins of life on Earth.':
    '收集到的材料可能含有有机分子，有助于解释地球上生命的起源。',
  'International space agencies are now collaborating on future asteroid exploration missions.':
    '各国航天机构目前正在合作开展未来的小行星探测任务。',
  'This achievement demonstrates the growing capabilities of robotic space exploration technology.':
    '这一成就展示了机器人太空探索技术日益增长的能力。',

  // current-affairs: Healthcare Innovation
  'Healthcare systems worldwide are undergoing rapid transformation through the adoption of innovative technologies.':
    '全球医疗系统正在通过采用创新技术进行快速转型。',
  'Artificial intelligence algorithms can now detect certain cancers with accuracy comparable to experienced physicians.':
    '人工智能算法现在可以以与经验丰富的医生相当的准确度检测出某些癌症。',
  'Telemedicine platforms have expanded access to specialist consultations for rural communities.':
    '远程医疗平台扩大了农村社区获得专科咨询的机会。',
  'Wearable health devices are enabling continuous patient monitoring outside hospital settings.':
    '可穿戴健康设备使得在医院环境之外对患者进行持续监测成为可能。',
  'These advances promise to reduce healthcare costs while improving patient outcomes.':
    '这些进步有望在降低医疗成本的同时改善患者的治疗效果。',
  'Regulatory bodies are working to establish appropriate oversight frameworks for these emerging technologies.':
    '监管机构正在努力为这些新兴技术建立适当的监督框架。',

  // junior-high: How Animals Communicate
  'Animals have many interesting ways to communicate with each other.':
    '动物有很多有趣的方式来互相交流。',
  'Birds sing songs to attract mates and warn others of danger.':
    '鸟类唱歌来吸引配偶并警告其他鸟类危险。',
  'Dolphins use clicking sounds to talk to their group members underwater.':
    '海豚使用咔嗒声在水下与同伴交流。',
  'Bees perform a special dance to tell other bees where to find flowers.':
    '蜜蜂跳一种特殊的舞蹈来告诉其他蜜蜂在哪里找到花朵。',
  'Even color can be a form of communication, as some animals change color to show their mood.':
    '颜色也可以是一种交流方式，因为有些动物会变色来表达情绪。',
  'Learning about animal communication helps us understand nature better.':
    '了解动物的交流方式有助于我们更好地理解大自然。',

  // junior-high: The Water Cycle
  'The water cycle is the continuous movement of water on our planet.':
    '水循环是水在地球上的持续运动。',
  'Water evaporates from oceans, lakes, and rivers when the sun heats it.':
    '当太阳加热水时，水从海洋、湖泊和河流中蒸发。',
  'The water vapor rises into the sky and forms clouds through condensation.':
    '水蒸气升入天空，通过凝结形成云。',
  'When clouds become heavy with water droplets, precipitation occurs as rain or snow.':
    '当云中的水滴变得很重时，就会以雨或雪的形式降落。',
  'The water then flows back into rivers and oceans, and the cycle begins again.':
    '水随后流回河流和海洋，循环重新开始。',
  'This process is essential for all life on Earth.':
    '这个过程对地球上所有生命都至关重要。',

  // junior-high: Famous Inventors
  'Throughout history, inventors have created things that changed how people live.':
    '纵观历史，发明家们创造了改变人们生活方式的事物。',
  'Thomas Edison invented the light bulb, which brought light to homes everywhere.':
    '托马斯·爱迪生发明了灯泡，为千家万户带来了光明。',
  'The Wright brothers built the first successful airplane, making air travel possible.':
    '莱特兄弟建造了第一架成功的飞机，使航空旅行成为可能。',
  'Alexander Graham Bell invented the telephone, allowing people to talk over long distances.':
    '亚历山大·格雷厄姆·贝尔发明了电话，让人们可以远距离通话。',
  'These inventors all shared one important quality: they never gave up when their experiments failed.':
    '这些发明家都有一个重要的共同品质：当实验失败时，他们从不放弃。',
  'Their persistence teaches us that great achievements require patience and hard work.':
    '他们的坚持告诉我们，伟大的成就需要耐心和努力。',

  // junior-high: Healthy Eating
  'Eating healthy food is very important for students who want to study well.':
    '对于想要学习好的学生来说，吃健康的食物非常重要。',
  'A good breakfast gives your brain energy for morning classes.':
    '一顿丰盛的早餐能为你的大脑提供上午上课所需的能量。',
  'Fruits and vegetables provide vitamins that keep your body strong.':
    '水果和蔬菜提供的维生素能让你的身体保持强壮。',
  'Drinking enough water throughout the day helps you concentrate.':
    '一整天喝足够的水有助于你集中注意力。',
  'Try to avoid too many sweets and snacks between meals.':
    '尽量避免在两餐之间吃太多甜食和零食。',
  'When you eat well, you can focus better in class and have more energy for sports and activities.':
    '当你吃得好时，你可以在课堂上更好地集中注意力，也有更多精力参加运动和活动。',

  // junior-high: Solar System
  'Our solar system has eight planets that orbit around the sun.':
    '我们的太阳系有八颗行星围绕太阳运行。',
  'Mercury is the closest planet to the sun and is very hot during the day.':
    '水星是最靠近太阳的行星，白天非常热。',
  'Earth is the only planet known to have life.':
    '地球是已知唯一有生命存在的行星。',
  'Jupiter is the largest planet and has a famous red spot that is actually a giant storm.':
    '木星是最大的行星，它著名的红斑实际上是一场巨大的风暴。',
  'Saturn is famous for its beautiful rings made of ice and rock.':
    '土星以其由冰和岩石构成的美丽光环而闻名。',
  'Scientists continue to explore space using telescopes and spacecraft to learn more about our cosmic neighborhood.':
    '科学家们继续使用望远镜和航天器探索太空，以更多地了解我们的宇宙邻域。',

  // senior-high: Social Media
  'Social media platforms have revolutionized the way humans communicate and form relationships.':
    '社交媒体平台彻底改变了人类交流和建立关系的方式。',
  'These digital tools enable instant connection across geographical boundaries, fostering global communities united by shared interests.':
    '这些数字工具实现了跨越地理界限的即时连接，促进了以共同兴趣为纽带的全球社区的形成。',
  'However, researchers have identified potential negative effects on mental health, particularly among adolescents who spend excessive time on these platforms.':
    '然而，研究人员发现了对心理健康的潜在负面影响，尤其是在这些平台上花费过多时间的青少年。',
  'The phenomenon of cyberbullying has emerged as a serious concern for educators and parents.':
    '网络欺凌现象已成为教育工作者和家长严重关注的问题。',
  'Understanding both the benefits and risks of social media literacy has become an essential skill for modern students.':
    '理解社交媒体素养的益处和风险已成为现代学生的一项必备技能。',

  // senior-high: Renewable Energy
  'The global transition to renewable energy sources represents one of the most significant technological shifts in human history.':
    '全球向可再生能源的转型代表着人类历史上最重大的技术变革之一。',
  'Solar panel efficiency has improved dramatically over the past decade while manufacturing costs have decreased substantially.':
    '在过去十年中，太阳能电池板的效率大幅提高，而制造成本大幅下降。',
  'Wind energy now provides a significant portion of electricity in several European countries.':
    '风能现在为几个欧洲国家提供了相当大比例的电力。',
  'Battery storage technology is addressing the intermittency challenges associated with renewable sources.':
    '电池储能技术正在解决与可再生能源相关的间歇性挑战。',
  'Governments around the world are implementing policies to accelerate this transition and reduce dependence on fossil fuels.':
    '世界各国政府正在实施政策以加速这一转型并减少对化石燃料的依赖。',

  // senior-high: Critical Thinking
  'Critical thinking is the ability to analyze information objectively and make reasoned judgments.':
    '批判性思维是客观分析信息并做出合理判断的能力。',
  'In an era of information overload, this skill has become more important than ever.':
    '在信息过载的时代，这项技能变得比以往任何时候都更加重要。',
  'Students must learn to distinguish between reliable sources and misinformation.':
    '学生必须学会区分可靠来源和错误信息。',
  'Developing critical thinking requires practice in identifying assumptions, evaluating evidence, and recognizing logical fallacies.':
    '培养批判性思维需要练习识别假设、评估证据和识别逻辑谬误。',
  'Educational institutions worldwide are incorporating critical thinking exercises into their curricula to prepare students for the challenges of modern life.':
    '全球教育机构正在将批判性思维练习纳入课程，为学生应对现代生活的挑战做准备。',

  // senior-high: Biodiversity
  'Biodiversity loss represents one of the most pressing environmental challenges facing our planet.':
    '生物多样性丧失是我们地球面临的最紧迫的环境挑战之一。',
  'Human activities such as deforestation, urbanization, and pollution have accelerated species extinction rates to alarming levels.':
    '森林砍伐、城市化和污染等人类活动已将物种灭绝速度加速到令人震惊的水平。',
  'Conservation biologists are employing various strategies including habitat restoration, captive breeding programs, and establishing protected areas.':
    '保护生物学家正在采用各种策略，包括栖息地恢复、人工繁殖计划和建立保护区。',
  'International cooperation is essential for protecting migratory species that cross national boundaries.':
    '国际合作对于保护跨越国界的迁徙物种至关重要。',
  'Education and community engagement play crucial roles in building public support for conservation efforts.':
    '教育和社区参与在建设公众对保护工作的支持方面发挥着关键作用。',

  // senior-high: AI Evolution
  'Artificial intelligence has evolved from a theoretical concept to a practical technology that influences many aspects of daily life.':
    '人工智能已从理论概念发展为影响日常生活许多方面的实用技术。',
  'Early AI research focused on rule-based systems that could solve specific problems.':
    '早期的人工智能研究专注于能解决特定问题的基于规则的系统。',
  'Modern machine learning approaches enable computers to improve their performance through experience without explicit programming.':
    '现代机器学习方法使计算机能够通过经验改进其性能，而无需明确的编程。',
  'Natural language processing allows machines to understand and generate human language with increasing sophistication.':
    '自然语言处理使机器能够以越来越高的复杂程度理解和生成人类语言。',
  'The ethical implications of AI deployment continue to spark important debates in academic and policy circles.':
    '人工智能部署的伦理影响继续在学术和政策界引发重要辩论。',

  // junior-senior-mixed: Psychology of Learning
  'Understanding how our brains learn can help us study more effectively.':
    '了解我们的大脑如何学习可以帮助我们更有效地学习。',
  'Scientists have discovered that the brain forms new connections when we learn something new.':
    '科学家发现，当我们学习新事物时，大脑会形成新的连接。',
  'Repeating information at spaced intervals helps transfer knowledge from short-term to long-term memory.':
    '按间隔重复信息有助于将知识从短期记忆转移到长期记忆。',
  'Getting enough sleep is crucial because the brain consolidates memories during rest.':
    '充足的睡眠至关重要，因为大脑在休息时会巩固记忆。',
  'Active learning methods like teaching others or solving problems are more effective than passive reading.':
    '主动学习方法（如教别人或解决问题）比被动阅读更有效。',
  'These insights can help students of all ages improve their study habits.':
    '这些见解可以帮助各年龄段的学生改善学习习惯。',

  // junior-senior-mixed: Environmental Protection
  'Protecting the environment starts with small actions in our daily lives.':
    '保护环境从日常生活中的小行动开始。',
  'Reducing plastic use by carrying reusable bags and water bottles makes a significant difference.':
    '通过携带可重复使用的袋子和水瓶来减少塑料使用，会产生显著的影响。',
  'Saving electricity by turning off lights and unplugging devices conserves energy resources.':
    '通过关灯和拔掉设备插头来节约用电，可以节省能源资源。',
  'Planting trees and maintaining gardens helps clean the air in our communities.':
    '种树和维护花园有助于净化我们社区的空气。',
  'Sorting waste for recycling ensures materials can be reused rather than ending up in landfills.':
    '垃圾分类回收确保材料可以被重新利用，而不是最终进入垃圾填埋场。',
  'When millions of people make small changes, the combined effect on the environment is enormous.':
    '当数百万人做出微小的改变时，对环境的综合影响是巨大的。',

  // junior-senior-mixed: Cultural Festivals
  'Every culture has special festivals that bring communities together in celebration.':
    '每种文化都有将社区聚集在一起庆祝的特别节日。',
  'Chinese New Year is celebrated with fireworks, red decorations, and family reunions.':
    '中国新年以烟花、红色装饰和家庭团聚来庆祝。',
  'Diwali in India is known as the festival of lights, where people light lamps and share sweets.':
    '印度的排灯节被称为灯节，人们点灯并分享甜食。',
  'Carnival in Brazil features colorful parades with music and dancing in the streets.':
    '巴西的狂欢节以街头彩色游行、音乐和舞蹈为特色。',
  'Thanksgiving in America brings families together to share a meal and express gratitude.':
    '美国的感恩节让家人聚在一起分享美食并表达感恩。',
  'These celebrations remind us of the rich diversity of human culture and tradition.':
    '这些庆祝活动提醒我们人类文化和传统的丰富多样性。',

  // junior-senior-mixed: Importance of Reading
  'Reading regularly offers many benefits beyond simple entertainment.':
    '经常阅读除了简单的娱乐之外还有很多好处。',
  'It expands our vocabulary naturally as we encounter new words in context.':
    '当我们在语境中遇到新词时，它会自然地扩大我们的词汇量。',
  'Reading fiction develops empathy by allowing us to experience different perspectives and emotions.':
    '阅读小说通过让我们体验不同的视角和情感来培养同理心。',
  'Non-fiction reading builds knowledge across various subjects and topics.':
    '非虚构类阅读可以在各种学科和主题中积累知识。',
  'Studies show that consistent readers perform better academically across all subjects.':
    '研究表明，坚持阅读的人在所有学科的学业成绩都更好。',
  'Setting aside just thirty minutes each day for reading can make a remarkable difference in language skills.':
    '每天只留出三十分钟阅读，就能在语言技能上产生显著的变化。',

  // junior-senior-mixed: Sports and Teamwork
  'Playing sports teaches important skills that are useful throughout life.':
    '运动教会我们在生活中有用的重要技能。',
  'Team sports require cooperation and communication between players to achieve shared goals.':
    '团队运动需要球员之间的合作和沟通来实现共同目标。',
  'Athletes learn to handle both victory and defeat with grace and sportsmanship.':
    '运动员学会以优雅和体育精神来面对胜利和失败。',
  'Regular physical activity improves concentration and reduces stress, benefiting academic performance.':
    '经常体育锻炼可以提高注意力并减轻压力，有利于学业成绩。',
  'Leadership skills develop naturally when players take responsibility for motivating their teammates.':
    '当球员承担起激励队友的责任时，领导力自然而然地发展起来。',
  'The discipline required for consistent training builds character and determination.':
    '持续训练所需的纪律可以塑造品格和决心。',

  // elementary: My Family
  'Everyone has a family.': '每个人都有一个家庭。',
  'Your father and mother are your parents.': '你的爸爸和妈妈是你的父母。',
  'Your brother and sister are your siblings.': '你的哥哥/弟弟和姐姐/妹妹是你的兄弟姐妹。',
  "Grandparents are your parents' parents.": '祖父母是你父母的父母。',
  'We love our family very much.': '我们非常爱我们的家人。',
  'Family members help each other every day.': '家庭成员每天互相帮助。',

  // elementary: Colors All Around Us
  'Colors are everywhere in our world.': '颜色在我们的世界中无处不在。',
  'The sky is blue on a sunny day.': '晴天时天空是蓝色的。',
  'Grass and leaves are green.': '草和树叶是绿色的。',
  'Flowers can be red, yellow, or purple.': '花可以是红色、黄色或紫色的。',
  'The sun looks orange at sunset.': '日落时太阳看起来是橙色的。',
  'Snow is white in winter.': '冬天的雪是白色的。',
  'Colors make our world beautiful and bright.': '颜色使我们的世界美丽而明亮。',

  // elementary: Animals on the Farm
  'A farm has many different animals.': '农场有许多不同的动物。',
  'Cows give us milk and say "moo."': '奶牛给我们牛奶，叫声是"哞"。',
  'Chickens lay eggs and say "cluck."': '鸡下蛋，叫声是"咯咯"。',
  'Pigs love mud and say "oink."': '猪喜欢泥巴，叫声是"哼哼"。',
  'Sheep have soft wool and say "baa."': '绵羊有柔软的羊毛，叫声是"咩"。',
  'Horses are strong and can run fast.': '马很强壮，跑得很快。',
  'Farmers take good care of all their animals.': '农民们精心照顾所有的动物。',

  // elementary: Days of the Week
  'There are seven days in a week.': '一周有七天。',
  'Monday is the first day of school.': '星期一是上学的第一天。',
  'Tuesday and Wednesday are in the middle of the week.': '星期二和星期三在一周的中间。',
  'Thursday comes before Friday.': '星期四在星期五之前。',
  'Friday is the last school day.': '星期五是最后一个上学日。',
  'Saturday and Sunday are the weekend.': '星期六和星期天是周末。',
  'The weekend is time for fun and rest.': '周末是玩乐和休息的时间。',

  // elementary: Fruits I Like
  'Fruits are healthy and delicious.': '水果既健康又美味。',
  'Apples are red or green and very crunchy.': '苹果是红色或绿色的，非常脆。',
  'Bananas are yellow and soft inside.': '香蕉外面是黄色的，里面很软。',
  'Oranges are round and full of juice.': '橙子是圆的，充满了果汁。',
  'Grapes come in bunches and can be purple or green.': '葡萄一串串的，可以是紫色或绿色的。',
  'Strawberries are small, red, and sweet.': '草莓又小又红又甜。',
  'I like to eat fruit every day.': '我喜欢每天吃水果。',
};

/**
 * Calls the MyMemory free translation API to translate English to Chinese.
 * Falls back to the offline dictionary if the API call fails.
 *
 * @param text - The English text to translate
 * @returns The Chinese translation
 * @throws Error when the API call fails and no fallback is available
 */
async function callTranslationAPI(text: string): Promise<string> {
  // Check the fallback dictionary first for known sentences
  if (FALLBACK_TRANSLATIONS[text]) {
    return FALLBACK_TRANSLATIONS[text];
  }

  try {
    // Use MyMemory free translation API (no key required, en→zh-CN)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();

    if (data?.responseData?.translatedText) {
      const translated = data.responseData.translatedText as string;
      // MyMemory sometimes returns the original text when it can't translate
      if (translated && translated !== text) {
        return translated;
      }
    }

    // If API returned no useful translation, generate a basic one
    throw new Error('No translation available');
  } catch {
    // Fallback: return a simple indicator that real translation failed
    // Still better than nothing - show the sentence structure hint
    return `[待翻译] ${text}`;
  }
}

// ============================================================
// Translation Service Implementation
// ============================================================

/**
 * Caches a successful translation to IndexedDB.
 */
async function cacheTranslation(
  original: string,
  translation: string
): Promise<void> {
  try {
    const entry: CachedTranslation = {
      original,
      translation,
      cachedAt: new Date(),
    };
    await put(STORE_NAMES.translations, entry);
  } catch {
    // Cache write failures are non-critical; log but don't throw
    console.warn('Failed to cache translation for:', original);
  }
}

/**
 * Type for the translation API function.
 * Allows injecting custom implementations for testing or swapping providers.
 */
export type TranslationAPIFn = (text: string) => Promise<string>;

/**
 * Creates a TranslationService instance with IndexedDB caching.
 * Optionally accepts a custom API function for dependency injection (testing, swapping providers).
 */
export function createTranslationService(apiFn?: TranslationAPIFn): TranslationService {
  const translateFn: TranslationAPIFn = apiFn ?? callTranslationAPI;
  return {
    /**
     * Translates a single sentence. Checks cache first, then calls the API.
     * Caches successful translations for offline use.
     * Returns "翻译暂不可用" on API failure.
     */
    async translateSentence(sentence: string): Promise<string> {
      if (!sentence || sentence.trim().length === 0) {
        return '';
      }

      // Check cache first
      const cached = await this.getCachedTranslation(sentence);
      if (cached !== null) {
        return cached;
      }

      // Call translation API
      try {
        const translation = await translateFn(sentence);
        // Cache the successful translation
        await cacheTranslation(sentence, translation);
        return translation;
      } catch {
        return TRANSLATION_UNAVAILABLE;
      }
    },

    /**
     * Batch translates multiple sentences. Used for full translation mode.
     * Checks cache for each sentence individually, only calls API for uncached ones.
     * Returns "翻译暂不可用" for any sentence that fails.
     */
    async translateBatch(sentences: string[]): Promise<string[]> {
      if (!sentences || sentences.length === 0) {
        return [];
      }

      const results: string[] = new Array(sentences.length);
      const uncachedIndices: number[] = [];
      const uncachedSentences: string[] = [];

      // Check cache for each sentence
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (!sentence || sentence.trim().length === 0) {
          results[i] = '';
          continue;
        }

        const cached = await this.getCachedTranslation(sentence);
        if (cached !== null) {
          results[i] = cached;
        } else {
          uncachedIndices.push(i);
          uncachedSentences.push(sentence);
        }
      }

      // Translate uncached sentences via API
      if (uncachedSentences.length > 0) {
        const translationPromises = uncachedSentences.map(async (sentence, idx) => {
          try {
            const translation = await translateFn(sentence);
            await cacheTranslation(sentence, translation);
            results[uncachedIndices[idx]!] = translation;
          } catch {
            results[uncachedIndices[idx]!] = TRANSLATION_UNAVAILABLE;
          }
        });

        await Promise.all(translationPromises);
      }

      return results;
    },

    /**
     * Looks up a cached translation from IndexedDB.
     * Returns null if no cached translation exists or if the cached value
     * is an old mock placeholder (starts with '[翻译]' or '[待翻译]').
     */
    async getCachedTranslation(sentence: string): Promise<string | null> {
      if (!sentence || sentence.trim().length === 0) {
        return null;
      }

      try {
        const cached = await getByKey(STORE_NAMES.translations, sentence);
        if (cached) {
          // Invalidate old mock translations that aren't real Chinese
          if (cached.translation.startsWith('[翻译]') || cached.translation.startsWith('[待翻译]')) {
            return null;
          }
          return cached.translation;
        }
        return null;
      } catch {
        // If IndexedDB lookup fails, treat as cache miss
        return null;
      }
    },
  };
}

// ============================================================
// Singleton Instance
// ============================================================

/**
 * Default singleton instance of the translation service.
 * Use this for application-wide translation needs.
 */
export const translationService = createTranslationService();

// ============================================================
// Exports for Testing
// ============================================================

export { TRANSLATION_UNAVAILABLE, callTranslationAPI, cacheTranslation };

/**
 * Convenience alias for creating a service with a custom API function.
 * Primarily used for testing error scenarios.
 */
export const createTranslationServiceWithAPI = createTranslationService;
