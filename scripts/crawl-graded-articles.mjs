/**
 * Graded Article Crawler - 译林版分年级英语文章
 * 
 * 按年级生成适合的英语阅读材料：
 * - 小学3-6年级（译林版）
 * - 高中高一/高二/高三（译林版）
 * 
 * Run with: node scripts/crawl-graded-articles.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 小学三年级 (Grade 3) - 最简单的句子和基础词汇
// ============================================================

function getGrade3Articles() {
  return [
    {
      title: 'Hello! My Name Is Tom',
      content: 'Hello! My name is Tom. I am eight years old. I am a boy. I have a dog. My dog is white. I like my dog very much. I go to school every day. My school is big. I have many friends at school. We play together after class. I am happy.',
      grade: '三年级',
    },
    {
      title: 'My Family',
      content: 'I have a happy family. There are four people in my family. They are my father, my mother, my sister and me. My father is tall. He is a teacher. My mother is beautiful. She is a doctor. My sister is five years old. She is cute. I love my family.',
      grade: '三年级',
    },
    {
      title: 'My Classroom',
      content: 'This is my classroom. It is big and clean. There are many desks and chairs. There is a blackboard on the wall. There are some flowers on the window. My teacher is kind. She teaches us English. I like English very much. I can say hello in English.',
      grade: '三年级',
    },
    {
      title: 'Colors I See',
      content: 'I can see many colors. The sky is blue. The grass is green. The sun is yellow. My bag is red. My pencil is orange. I like all colors. Red is my favorite color. What color do you like? Colors make the world beautiful.',
      grade: '三年级',
    },
    {
      title: 'My Pet Cat',
      content: 'I have a pet cat. Her name is Mimi. She is small and white. She has two big eyes. She likes to eat fish. She likes to sleep on my bed. She is very cute. I play with her every day. She is my good friend. I love Mimi.',
      grade: '三年级',
    },
  ];
}

// ============================================================
// 小学四年级 (Grade 4)
// ============================================================

function getGrade4Articles() {
  return [
    {
      title: 'A Day at the Zoo',
      content: 'Last Sunday, I went to the zoo with my parents. We saw many animals there. The monkeys were very funny. They jumped from tree to tree. The elephants were very big. They used their long noses to drink water. I also saw pandas. They were eating bamboo. I took many photos. It was a wonderful day.',
      grade: '四年级',
    },
    {
      title: 'My Favorite Season',
      content: 'There are four seasons in a year. They are spring, summer, autumn and winter. My favorite season is spring. In spring, the weather is warm. The flowers bloom and the birds sing. I can fly kites in the park. The trees turn green again. Everything looks fresh and new. I feel happy in spring.',
      grade: '四年级',
    },
    {
      title: 'Shopping with Mom',
      content: 'Today I went shopping with my mom. We went to the supermarket. Mom bought some vegetables and fruit. I wanted some chocolate, but Mom said I should eat less sweets. So I chose an apple instead. Then we bought some bread and milk for breakfast. We carried the bags home together. I like helping Mom.',
      grade: '四年级',
    },
    {
      title: 'My Weekend',
      content: 'I am very busy on weekends. On Saturday morning, I do my homework. In the afternoon, I have a piano lesson. On Sunday, I usually go to the park with my friends. We ride bikes and play games. Sometimes I help my mother cook dinner. I enjoy my weekends very much.',
      grade: '四年级',
    },
    {
      title: 'The Little Red Hen',
      content: 'Once upon a time, there was a little red hen. She found some wheat seeds. She asked her friends to help her plant the seeds. But nobody wanted to help. So she did it alone. She watered the wheat and watched it grow. When the bread was ready, everyone wanted to eat it. But the little red hen ate it herself. She worked hard for it.',
      grade: '四年级',
    },
  ];
}

// ============================================================
// 小学五年级 (Grade 5)
// ============================================================

function getGrade5Articles() {
  return [
    {
      title: 'My Best Friend',
      content: 'My best friend is Lucy. She is in the same class as me. She has long black hair and big eyes. She is very kind and always helps others. We often study together after school. On weekends, we sometimes go to the library to read books. She likes reading stories about animals. I like science books. Although we have different hobbies, we are still best friends.',
      grade: '五年级',
    },
    {
      title: 'A Trip to the Farm',
      content: 'Last month, our class went to visit a farm. The farm was very large. There were cows, sheep, chickens and ducks. The farmer showed us how to milk a cow. It was not easy! We also picked some strawberries in the field. They were red and sweet. We learned a lot about farming that day. I think farmers work very hard to give us food.',
      grade: '五年级',
    },
    {
      title: 'Protecting the Environment',
      content: 'Our Earth is our home. We should protect it. We can do many things to help. First, we should save water. Do not leave the tap running. Second, we should save electricity. Turn off the lights when you leave a room. Third, we can plant more trees. Trees help clean the air. Fourth, we should not throw rubbish on the ground. Let us work together to keep our Earth clean and beautiful.',
      grade: '五年级',
    },
    {
      title: 'The Four Seasons',
      content: 'I love all four seasons. In spring, flowers bloom everywhere. The weather becomes warmer day by day. In summer, we can swim in the pool and eat ice cream. It is very hot but fun. In autumn, leaves turn yellow and red. We can see beautiful scenery. In winter, sometimes it snows. We can make snowmen and have snowball fights. Each season has its own beauty.',
      grade: '五年级',
    },
    {
      title: 'Learning to Cook',
      content: 'Last weekend, I learned to cook with my grandmother. She taught me how to make fried rice. First, we prepared the ingredients: rice, eggs, vegetables and some salt. Then she showed me how to heat the pan and add oil. I cracked the eggs and stirred them in the pan. After that, we added the rice and vegetables. It smelled delicious! My family said my fried rice was very good. I felt proud of myself.',
      grade: '五年级',
    },
  ];
}

// ============================================================
// 小学六年级 (Grade 6)
// ============================================================

function getGrade6Articles() {
  return [
    {
      title: 'An Unforgettable School Trip',
      content: 'Last week, our school organized a trip to the science museum. When we arrived, I was amazed by the huge dinosaur skeleton at the entrance. We visited different exhibition halls, including space exploration, ocean life, and human body. My favorite part was the interactive experiment zone, where we could do simple science experiments by ourselves. I learned that science is everywhere in our daily life. This trip made me more interested in learning science.',
      grade: '六年级',
    },
    {
      title: 'The Importance of Reading',
      content: 'Reading is one of the best habits a student can develop. When we read, we learn new words and expressions. Reading can take us to places we have never been. Through books, we can travel to different countries, meet interesting characters, and learn about history. My teacher always encourages us to read at least thirty minutes every day. I have started reading English storybooks recently. At first it was difficult, but now I can understand more and more. I believe reading will help me become a better learner.',
      grade: '六年级',
    },
    {
      title: 'My Dream Job',
      content: 'Everyone has a dream about their future job. Some of my classmates want to be doctors because they want to help sick people. Others want to be teachers because they love children. My dream is to become a scientist. I want to invent things that can help solve environmental problems. To achieve my dream, I know I need to study hard, especially in science and mathematics. I also need to be creative and never give up when I face difficulties. I believe that if I work hard enough, my dream will come true one day.',
      grade: '六年级',
    },
    {
      title: 'Chinese Traditional Festivals',
      content: 'China has many traditional festivals throughout the year. The Spring Festival is the most important one. Families get together, eat dumplings, and set off fireworks. The Mid-Autumn Festival is in September or October. People eat mooncakes and enjoy the full moon. The Dragon Boat Festival is in May or June. We eat zongzi and watch dragon boat races. These festivals help us remember our culture and bring families together. I am proud of our rich cultural traditions.',
      grade: '六年级',
    },
    {
      title: 'How to Stay Healthy',
      content: 'Staying healthy is very important for students. Here are some tips to keep fit. First, we should eat a balanced diet with plenty of fruits and vegetables. Try not to eat too much junk food. Second, we need enough sleep. Students should sleep at least eight hours every night. Third, exercise regularly. Playing sports or taking a walk after dinner is good for our body. Fourth, keep a happy mood. Talk to friends or family when you feel sad. If we follow these tips, we can have a strong body and a clear mind for studying.',
      grade: '六年级',
    },
  ];
}

// ============================================================
// 高一 (Senior High Grade 1) - 必修一至必修二话题
// ============================================================

function getSeniorHigh1Articles() {
  return [
    {
      title: 'Starting High School: A New Chapter',
      content: 'Starting high school is both exciting and challenging. Everything is new: the campus, the teachers, the subjects, and the classmates. The first few weeks can be overwhelming as students adjust to a heavier academic workload and higher expectations. However, this transition also brings wonderful opportunities. Joining clubs, making new friends, and discovering new interests are all part of the experience. The key to a successful start is maintaining a positive attitude, managing time effectively, and not being afraid to ask for help when needed. Remember that every senior student was once in your shoes, feeling the same uncertainty and excitement.',
      grade: '高一',
    },
    {
      title: 'The Value of Friendship in Teenage Years',
      content: 'Friendships formed during teenage years often leave lasting impressions on our lives. Good friends provide emotional support during difficult times, celebrate our achievements, and help us grow as individuals. However, maintaining healthy friendships requires effort from both sides. Communication is essential: expressing feelings honestly and listening actively to others builds trust and understanding. It is also important to respect differences in opinions and interests. Sometimes friendships change or fade, and that is a natural part of growing up. What matters most is learning to be a loyal, understanding, and supportive friend.',
      grade: '高一',
    },
    {
      title: 'Exploring Nature: The Benefits of Outdoor Activities',
      content: 'In an age dominated by screens and technology, spending time outdoors has become more important than ever. Research shows that contact with nature reduces stress, improves mood, and enhances concentration. For students facing academic pressure, a walk in the park or a hike in the mountains can provide much-needed mental refreshment. Outdoor activities also promote physical health through exercise and exposure to fresh air and sunlight. Whether it is gardening, bird watching, or simply sitting under a tree reading a book, connecting with nature offers benefits that no indoor activity can fully replicate. Schools should encourage students to spend more time outdoors as part of a balanced lifestyle.',
      grade: '高一',
    },
    {
      title: 'Digital Literacy: Navigating the Online World',
      content: 'Today\'s high school students are digital natives who have grown up with smartphones and social media. While technology offers tremendous learning opportunities, it also presents challenges that require critical thinking skills. Digital literacy means more than knowing how to use devices. It involves evaluating the reliability of online information, understanding how algorithms shape what we see, protecting personal privacy, and communicating respectfully in digital spaces. Students who develop strong digital literacy skills are better prepared for both academic success and responsible citizenship in an increasingly connected world.',
      grade: '高一',
    },
    {
      title: 'The Magic of Music in Our Lives',
      content: 'Music accompanies us through every stage of life, from lullabies in infancy to the songs that define our teenage years. Scientific research has demonstrated that music affects brain function in remarkable ways. Listening to music can reduce anxiety, improve memory, and even enhance physical performance during exercise. Learning to play an instrument develops discipline, patience, and fine motor skills while providing a creative outlet for emotions that may be difficult to express in words. In Chinese culture, music has been valued for thousands of years as a means of cultivating character and achieving inner harmony.',
      grade: '高一',
    },
  ];
}

// ============================================================
// 高二 (Senior High Grade 2) - 必修三至选择性必修二话题
// ============================================================

function getSeniorHigh2Articles() {
  return [
    {
      title: 'Climate Change: A Challenge for Our Generation',
      content: 'Climate change is no longer a distant threat but a present reality that our generation must confront. Rising global temperatures are causing more frequent extreme weather events, threatening food security, and displacing communities worldwide. The science is clear: human activities, particularly the burning of fossil fuels, are the primary drivers of this crisis. Addressing climate change requires coordinated action at every level, from international agreements to individual lifestyle choices. Young people around the world are increasingly vocal in demanding meaningful climate action from governments and corporations. As future leaders, today\'s students have both the responsibility and the opportunity to shape a more sustainable world.',
      grade: '高二',
    },
    {
      title: 'The Silk Road: Bridge Between Civilizations',
      content: 'The ancient Silk Road was far more than a trade route. It served as a bridge connecting diverse civilizations across thousands of kilometers, facilitating the exchange of goods, ideas, technologies, and cultural practices between East and West. Chinese inventions such as papermaking, printing, gunpowder, and the compass traveled westward along these routes, profoundly influencing European development. In return, crops, musical instruments, and religious philosophies flowed eastward into China. Today, the Belt and Road Initiative draws inspiration from this historical legacy of mutual benefit through connectivity. Understanding the Silk Road helps us appreciate how cooperation between different cultures has always driven human progress.',
      grade: '高二',
    },
    {
      title: 'Artificial Intelligence: Promise and Peril',
      content: 'Artificial intelligence is rapidly transforming industries from healthcare to transportation, raising fundamental questions about the future of work and human identity. Machine learning algorithms can now diagnose diseases, compose music, write code, and defeat human champions in complex games. While these capabilities offer enormous potential benefits, they also create significant challenges. How do we ensure AI systems are fair and unbiased? How do we protect jobs that may be automated? How do we maintain human agency in a world of intelligent machines? These questions require interdisciplinary thinking that combines technical knowledge with ethical reasoning and humanistic values.',
      grade: '高二',
    },
    {
      title: 'Ocean Conservation: Protecting Our Blue Planet',
      content: 'Covering more than seventy percent of Earth\'s surface, oceans regulate our climate, produce much of our oxygen, and support an extraordinary diversity of life. Yet human activities are pushing marine ecosystems toward crisis. Overfishing has collapsed numerous fish populations. Plastic pollution has infiltrated every level of the ocean food chain. Rising temperatures and acidification threaten coral reefs that support millions of species. Effective ocean conservation requires international cooperation, sustainable fishing practices, dramatic reduction in plastic waste, and expansion of marine protected areas. As coastal nations with rich maritime heritage, both China and its neighbors have vital roles to play in ocean stewardship.',
      grade: '高二',
    },
    {
      title: 'The Psychology of Learning and Memory',
      content: 'Understanding how the brain learns and remembers information can dramatically improve academic performance. Cognitive science has revealed several evidence-based strategies that enhance learning. Spaced repetition, which involves reviewing material at gradually increasing intervals, produces much stronger long-term retention than cramming. Active recall, the practice of testing yourself rather than passively rereading notes, strengthens neural pathways associated with memory retrieval. Interleaving different subjects during study sessions improves the ability to discriminate between concepts and apply knowledge flexibly. Sleep plays a crucial role in memory consolidation, making adequate rest an essential component of effective studying rather than a luxury to be sacrificed.',
      grade: '高二',
    },
  ];
}

// ============================================================
// 高三 (Senior High Grade 3) - 选择性必修三至四及高考话题
// ============================================================

function getSeniorHigh3Articles() {
  return [
    {
      title: 'Global Citizenship in an Interconnected World',
      content: 'In an era of unprecedented global interconnection, the concept of citizenship extends beyond national borders. Global citizens recognize that challenges such as climate change, pandemic disease, economic inequality, and technological disruption transcend the capacity of any single nation to address alone. This perspective does not diminish the importance of national identity or cultural heritage but rather complements them with an awareness of shared humanity and collective responsibility. Developing global citizenship requires cultivating intercultural competence, critical thinking about complex systems, and the moral courage to act on behalf of those beyond our immediate communities. Education plays a vital role in preparing young people to navigate and contribute to an increasingly interdependent world.',
      grade: '高三',
    },
    {
      title: 'Scientific Innovation and Ethical Responsibility',
      content: 'The history of scientific progress demonstrates both the transformative power of human ingenuity and the critical importance of ethical reflection. From the development of nuclear energy to the revolution in genetic engineering, breakthrough technologies have consistently presented society with profound moral dilemmas. The emergence of gene editing technologies such as CRISPR raises questions about the boundaries of human intervention in biological processes. Artificial intelligence systems capable of autonomous decision-making challenge traditional notions of accountability and moral agency. Scientists bear a special responsibility to consider the broader implications of their work, engaging with ethicists, policymakers, and the public to ensure that technological capabilities are guided by human values rather than deployed without adequate forethought.',
      grade: '高三',
    },
    {
      title: 'Literature as a Mirror of Human Experience',
      content: 'Great literature transcends the boundaries of time and culture, offering insights into the human condition that remain relevant across generations. Through the works of authors from Shakespeare to Lu Xun, readers encounter universal themes of love, loss, ambition, justice, and the search for meaning. Literary analysis develops critical thinking skills essential for academic success and informed citizenship. It teaches readers to consider multiple perspectives, identify underlying assumptions, recognize the power of language to shape perception, and evaluate arguments with intellectual rigor. Moreover, engaging deeply with literature cultivates empathy and emotional intelligence by allowing readers to inhabit lives radically different from their own, fostering the kind of understanding that is essential in diverse, democratic societies.',
      grade: '高三',
    },
    {
      title: 'Sustainable Development: Balancing Growth and Conservation',
      content: 'Sustainable development represents perhaps the greatest challenge facing humanity in the twenty-first century: how to meet the needs of the present generation without compromising the ability of future generations to meet their own needs. This concept requires balancing economic growth, social equity, and environmental protection, recognizing that these three dimensions are fundamentally interconnected. China\'s ecological civilization initiative represents a significant effort to integrate environmental sustainability into economic planning and governance structures. The transition to renewable energy, development of circular economy models, and restoration of degraded ecosystems all contribute to this vision. Individual choices regarding consumption, transportation, and waste management collectively shape the trajectory of sustainable development.',
      grade: '高三',
    },
    {
      title: 'The Art of Persuasive Writing and Public Speaking',
      content: 'The ability to communicate persuasively, whether in writing or speech, is among the most valuable skills one can develop. Effective persuasion combines logical argumentation with emotional appeal and personal credibility. Aristotle identified these three elements as logos, pathos, and ethos, a framework that remains relevant today. Constructing a persuasive argument requires clearly stating a thesis, providing relevant and credible evidence, anticipating and addressing counterarguments, and organizing ideas in a logical progression. The most compelling communicators also understand their audience, adapting their language, tone, and examples to resonate with specific listeners or readers. Developing these skills requires extensive practice through essay writing, debate participation, and public speaking opportunities.',
      grade: '高三',
    },
  ];
}

// ============================================================
// Save Articles to Supabase
// ============================================================

async function saveArticles(articles) {
  if (articles.length === 0) { console.log('\n⚠️ No articles to save.'); return; }
  console.log(`\n💾 Saving ${articles.length} graded articles to Supabase...`);

  let saved = 0;
  let skipped = 0;

  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20);
    const { error } = await supabase.from('articles').upsert(batch, { onConflict: 'title', ignoreDuplicates: true });
    if (error) {
      for (const article of batch) {
        const { error: e2 } = await supabase.from('articles').insert(article);
        if (e2) { skipped++; } else { saved++; }
      }
    } else {
      saved += batch.length;
    }
  }

  console.log(`  ✅ Saved: ${saved}, Skipped (duplicates): ${skipped}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('🚀 Starting graded article generator (译林版分年级)...\n');

  // 小学 (elementary)
  const grade3 = getGrade3Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 200) + '...',
    content: a.content,
    source_name: `译林版小学英语 - ${a.grade}`,
    source_url: '',
    content_source: 'elementary',
    difficulty: 'beginner',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const grade4 = getGrade4Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 200) + '...',
    content: a.content,
    source_name: `译林版小学英语 - ${a.grade}`,
    source_url: '',
    content_source: 'elementary',
    difficulty: 'beginner',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const grade5 = getGrade5Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 200) + '...',
    content: a.content,
    source_name: `译林版小学英语 - ${a.grade}`,
    source_url: '',
    content_source: 'elementary',
    difficulty: 'beginner',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const grade6 = getGrade6Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 200) + '...',
    content: a.content,
    source_name: `译林版小学英语 - ${a.grade}`,
    source_url: '',
    content_source: 'elementary',
    difficulty: 'beginner',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  // 高中 (senior-high)
  const seniorHigh1 = getSeniorHigh1Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 250) + '...',
    content: a.content,
    source_name: `译林版高中英语 - ${a.grade}`,
    source_url: '',
    content_source: 'senior-high',
    difficulty: 'intermediate',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const seniorHigh2 = getSeniorHigh2Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 250) + '...',
    content: a.content,
    source_name: `译林版高中英语 - ${a.grade}`,
    source_url: '',
    content_source: 'senior-high',
    difficulty: 'advanced',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const seniorHigh3 = getSeniorHigh3Articles().map(a => ({
    title: a.title,
    summary: a.content.substring(0, 250) + '...',
    content: a.content,
    source_name: `译林版高中英语 - ${a.grade}`,
    source_url: '',
    content_source: 'senior-high',
    difficulty: 'advanced',
    grade: a.grade,
    published_at: new Date().toISOString(),
  }));

  const allArticles = [
    ...grade3, ...grade4, ...grade5, ...grade6,
    ...seniorHigh1, ...seniorHigh2, ...seniorHigh3,
  ];

  console.log('📊 Article count by grade:');
  console.log(`  小学三年级: ${grade3.length}`);
  console.log(`  小学四年级: ${grade4.length}`);
  console.log(`  小学五年级: ${grade5.length}`);
  console.log(`  小学六年级: ${grade6.length}`);
  console.log(`  高一: ${seniorHigh1.length}`);
  console.log(`  高二: ${seniorHigh2.length}`);
  console.log(`  高三: ${seniorHigh3.length}`);
  console.log(`  Total: ${allArticles.length}`);

  await saveArticles(allArticles);

  console.log('\n✨ Done!');
}

main().catch(console.error);
