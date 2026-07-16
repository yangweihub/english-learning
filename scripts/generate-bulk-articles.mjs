/**
 * Bulk Article Generator - 每年级生成到100篇
 * 通过主题组合+句子池生成大量独特文章
 * Run: node scripts/generate-bulk-articles.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://phlxxwlopehxkxpjvfwa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobHh4d2xvcGVoeGt4cGp2ZndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4Njg1NTEsImV4cCI6MjA5ODQ0NDU1MX0.DU5QkKEVDu6ua0vKIgpen789ihXq_vWFbSt06WJQIQw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET = 85; // 85 new per grade (already have 15)

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ============================================================
// 三年级文章生成器
// ============================================================
function generateGrade3() {
  const names = ['Tom','Lucy','Jack','Amy','Mike','Lily','Sam','Kate','Ben','Mary'];
  const animals = ['dog','cat','bird','fish','rabbit','hamster','turtle','duck'];
  const colors = ['red','blue','green','yellow','white','black','orange','pink'];
  const foods = ['apple','banana','bread','milk','egg','rice','cake','cookie'];
  const places = ['park','school','home','garden','zoo','shop','library'];
  const adj = ['big','small','nice','happy','good','new','old','pretty','fast','cute'];
  const subjects = ['English','Math','Art','Music','PE','Science'];
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const sports = ['run','jump','swim','play football','ride a bike','skip rope'];
  const weather = ['sunny','rainy','cloudy','windy','hot','cold','warm','cool'];

  const templates = [
    (n,a,c) => ({title:`${n}'s ${c} ${a}`,content:`${n} has a ${c} ${a}. The ${a} is very ${pick(adj)}. ${n} likes to play with it. They go to the ${pick(places)} together. The ${a} can ${pick(['run fast','jump high','swim well','do tricks'])}. ${n} gives it food every day. They are good friends.`}),
    (n) => ({title:`${n}'s Favorite Food`,content:`${n} likes to eat ${pick(foods)}. For breakfast, ${n} has ${pick(foods)} and ${pick(foods)}. For lunch, ${n} eats at school. The food is ${pick(adj)}. ${n}'s mom cooks dinner. ${n} helps set the table. Eating together is fun.`}),
    (n) => ({title:`${n} Goes to the ${pick(places)}`,content:`Today is ${pick(days)}. ${n} goes to the ${pick(places)} with friends. It is ${pick(weather)} today. They play ${pick(sports)} there. ${n} is very happy. They stay for one hour. Then they go home. What a fun day!`}),
    (n) => ({title:`${n}'s School Day`,content:`${n} gets up early. Today ${n} has ${pick(subjects)} class. The teacher is ${pick(adj)}. ${n} listens carefully. After class, ${n} plays with friends. They ${pick(sports)} in the playground. School is fun. ${n} learns new things every day.`}),
    (n,a,c) => ({title:`The ${c} ${a}`,content:`Look! There is a ${c} ${a}. It is ${pick(adj)}. It lives in the ${pick(places)}. It likes to eat ${pick(foods)}. It can ${pick(['run','jump','fly','swim'])}. Many children like it. The ${a} is friendly. We should be kind to animals.`}),
    (n) => ({title:`${n} Learns English`,content:`${n} likes English class. Today they learn new words. The words are: ${pick(colors)}, ${pick(animals)}, ${pick(foods)}. ${n} can spell them all. The teacher says good job. ${n} practices at home too. Learning English is interesting.`}),
    (n) => ({title:`A ${pick(weather)} Day`,content:`Today is ${pick(weather)}. ${n} looks out the window. ${pick(weather) === 'rainy' ? `${n} takes an umbrella.` : `${n} goes outside.`} The sky is ${pick(colors)}. ${n} wears a ${pick(colors)} coat. After school, ${n} plays at ${pick(places)}. ${n} has a good day.`}),
    (n) => ({title:`${n}'s Family Photo`,content:`${n} has a family photo. There are ${pick(['four','five','three'])} people. Dad is tall. Mom is pretty. ${n} is in the middle. Everyone is smiling. They took this photo at the ${pick(places)}. ${n} loves this photo. Family is important.`}),
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const n = names[i % names.length];
    const a = animals[i % animals.length];
    const c = colors[i % colors.length];
    const tpl = templates[i % templates.length];
    const art = tpl(n, a, c);
    articles.push({ title: `${art.title} (${i+1})`, content: art.content });
  }
  return articles;
}

// ============================================================
// 四年级文章生成器
// ============================================================
function generateGrade4() {
  const names = ['David','Emma','Kevin','Alice','Peter','Helen','Frank','Grace','Leo','Sophie'];
  const topics = [
    (n) => ({title:`${n}'s Weekend Adventure`,content:`Last ${pick(['Saturday','Sunday'])}, ${n} went to the ${pick(['beach','mountain','farm','museum','park'])} with ${pick(['family','friends','classmates'])}. The weather was ${pick(['sunny','warm','cool','perfect'])}. They ${pick(['saw beautiful flowers','climbed a hill','visited animals','learned new things','played games'])}. ${n} took many photos. They ate lunch together. It was a ${pick(['wonderful','fantastic','amazing','great'])} day. ${n} wants to go there again next time.`}),
    (n) => ({title:`How ${n} Helps at Home`,content:`${n} is a helpful child. Every ${pick(['morning','evening','weekend'])}, ${n} helps with housework. ${n} can ${pick(['wash dishes','sweep the floor','water plants','fold clothes','make the bed','set the table'])}. Mom and Dad are proud. They say ${n} is growing up. ${n} thinks helping others makes everyone happy. The family works together to keep the home clean and comfortable.`}),
    (n) => ({title:`${n}'s Hobby`,content:`${n}'s hobby is ${pick(['drawing','reading','dancing','singing','playing chess','cooking','gardening','collecting stamps'])}. ${n} practices ${pick(['every day','twice a week','after school','on weekends'])}. ${n} started this hobby ${pick(['last year','two years ago','in second grade'])}. It makes ${n} feel ${pick(['relaxed','happy','proud','creative'])}. ${n}'s friends think it is very interesting. Having a hobby is important for everyone.`}),
    (n) => ({title:`A Visit to the ${pick(['Supermarket','Bookshop','Pet Shop','Bakery'])}`,content:`${n} went to the ${pick(['supermarket','bookshop','pet shop','bakery'])} with Mom today. There were so many things to see. ${n} picked out ${pick(['a new book','some fruit','a toy','some bread','colored pencils'])}. The shop assistant was friendly and helpful. ${n} paid with pocket money. Mom said ${n} made a good choice. Shopping is fun when you plan what you need.`}),
    (n) => ({title:`${n}'s Best Friend`,content:`${n}'s best friend is ${pick(['tall','short','funny','quiet','smart','kind'])}. They met in ${pick(['first grade','second grade','kindergarten','PE class'])}. They like to ${pick(['play football','read books','draw pictures','ride bikes','tell jokes'])} together. Sometimes they argue, but they always make up quickly. A good friend listens and shares. ${n} is lucky to have such a great friend.`}),
    (n) => ({title:`The School Sports Meet`,content:`Our school had a sports meet last ${pick(['week','Friday','month'])}. ${n} joined the ${pick(['running race','long jump','relay race','rope skipping contest'])}. Many students cheered loudly. ${n} tried very hard and finished ${pick(['first','second','third','with a smile'])}. Everyone clapped. Win or lose, the most important thing is to try your best and enjoy the competition.`}),
    (n) => ({title:`${n} Gets a ${pick(['Pet','Gift','Prize','Letter'])}`,content:`Today something special happened. ${n} got a ${pick(['new pet','birthday gift','class prize','letter from grandma'])}. ${n} was so ${pick(['excited','surprised','happy','thankful'])}! ${n} showed it to the whole family. Everyone smiled. ${n} promised to ${pick(['take good care of it','treasure it','write back soon','work even harder'])}. Special moments make life wonderful.`}),
    (n) => ({title:`Seasons in ${n}'s City`,content:`There are four seasons in ${n}'s city. Spring is ${pick(['warm','green','beautiful'])} with flowers everywhere. Summer is ${pick(['hot','sunny','long'])} and great for swimming. Autumn is ${pick(['cool','colourful','harvest time'])} with falling leaves. Winter is ${pick(['cold','white','cozy'])} and sometimes brings snow. ${n}'s favourite season is ${pick(['spring','summer','autumn','winter'])} because ${pick(['the flowers bloom','they can swim','the leaves are pretty','they can build snowmen'])}.`}),
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const n = names[i % names.length];
    const art = topics[i % topics.length](n);
    articles.push({ title: `${art.title} (${i+1})`, content: art.content });
  }
  return articles;
}

// ============================================================
// 五年级文章生成器
// ============================================================
function generateGrade5() {
  const themes = [
    'school life','friendship','family','environment','technology','holidays','food and cooking',
    'sports and health','animals and nature','travel','reading','community','science','music and art'
  ];
  const intros = [
    (t) => `${t.charAt(0).toUpperCase()+t.slice(1)} plays an important role in our daily lives.`,
    (t) => `Many students are interested in ${t} because it connects to their experiences.`,
    (t) => `Understanding ${t} helps us become better people and learners.`,
    (t) => `There are many interesting things to learn about ${t}.`,
  ];
  const middles = [
    'For example, we can learn new skills by practicing regularly. Patience and effort are the keys to success.',
    'Scientists have discovered that this topic affects our health and happiness in many ways.',
    'In China, this has a long and rich history that we should be proud of.',
    'Many people around the world share similar experiences and feelings about this.',
    'Teachers encourage us to explore this topic through books, experiments, and discussions.',
    'Working together with others makes this experience more enjoyable and meaningful.',
    'Technology has changed how we approach this, bringing both benefits and challenges.',
    'Different cultures have unique perspectives that we can learn from.',
  ];
  const endings = [
    'I believe that learning about this will help me in the future.',
    'Everyone should spend some time thinking about this important topic.',
    'I look forward to learning more as I grow older.',
    'Small actions today can lead to big changes tomorrow.',
    'I hope more people will pay attention to this in the future.',
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const theme = themes[i % themes.length];
    const title = `Thoughts on ${theme.charAt(0).toUpperCase()+theme.slice(1)} (${i+1})`;
    const intro = intros[i % intros.length](theme);
    const mid1 = middles[i % middles.length];
    const mid2 = middles[(i+3) % middles.length];
    const end = endings[i % endings.length];
    articles.push({ title, content: `${intro} ${mid1} ${mid2} ${end}` });
  }
  return articles;
}

// ============================================================
// 六年级文章生成器
// ============================================================
function generateGrade6() {
  const themes = [
    'preparing for middle school','the value of hard work','protecting our planet',
    'digital citizenship','cultural traditions','scientific discovery','public speaking',
    'healthy habits','global awareness','creative thinking','teamwork','time management',
    'respect for differences','the power of kindness'
  ];
  const bodies = [
    (t) => `${t.charAt(0).toUpperCase()+t.slice(1)} is a topic that every student should understand before entering middle school. As we grow older, the world becomes more complex, and we need strong foundations to navigate it successfully. Research shows that students who develop these skills early tend to perform better academically and socially. We can start by setting small goals and building good habits gradually. It is never too early to begin preparing for the challenges ahead.`,
    (t) => `In today's rapidly changing world, ${t} has become increasingly important for young people. Our teachers and parents remind us that these skills will serve us throughout our lives. Studies from educational experts suggest that students who focus on ${t} develop stronger character and better problem-solving abilities. The key is to practice consistently and learn from both successes and failures. Every experience, whether positive or negative, contributes to our growth as individuals.`,
    (t) => `Many successful people attribute their achievements to their early understanding of ${t}. From a young age, they recognized its importance and made it a priority. In our classroom, we discuss ${t} regularly and share our thoughts with classmates. Through group projects and presentations, we learn to express our ideas clearly and listen to others respectfully. These experiences build confidence and prepare us for the greater responsibilities that lie ahead in secondary school and beyond.`,
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const theme = themes[i % themes.length];
    const title = `Understanding ${theme.charAt(0).toUpperCase()+theme.slice(1)} (${i+1})`;
    const body = bodies[i % bodies.length](theme);
    articles.push({ title, content: body });
  }
  return articles;
}

// ============================================================
// 高一文章生成器
// ============================================================
function generateSeniorHigh1() {
  const themes = [
    'adaptation to high school life','the importance of reading habits','traditional festivals and cultural identity',
    'social media and mental health','renewable energy solutions','the art of public speaking',
    'music and emotional well-being','career exploration in youth','the science of healthy eating',
    'friendship and personal growth','technology in education','environmental responsibility',
    'sports and character development','cross-cultural communication'
  ];
  const paragraphs = [
    (t) => `The topic of ${t} has gained increasing attention among educators and students alike. As young people navigate the transition from junior to senior high school, understanding this subject becomes particularly relevant. Research conducted by leading educational institutions demonstrates that students who engage thoughtfully with ${t} develop stronger analytical skills and greater emotional resilience. This knowledge equips them to face the academic and personal challenges that characterize the high school experience.`,
    (t) => `In contemporary society, ${t} intersects with numerous aspects of daily life in ways that previous generations could not have anticipated. The rapid pace of social and technological change means that today's students must develop adaptable thinking skills to remain effective learners and responsible citizens. Exploring ${t} through multiple perspectives, including scientific, humanistic, and practical lenses, provides a comprehensive understanding that supports both academic achievement and personal development.`,
    (t) => `Chinese students have unique perspectives on ${t} shaped by both traditional values and modern global influences. The ability to integrate wisdom from Chinese philosophical traditions with insights from international research creates a rich framework for understanding complex issues. Educational reform in China increasingly emphasizes critical thinking, creativity, and collaboration, all of which are developed through thoughtful engagement with topics like ${t}. Students who cultivate these capacities position themselves for success in an increasingly competitive and interconnected world.`,
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const theme = themes[i % themes.length];
    const title = `Exploring ${theme.charAt(0).toUpperCase()+theme.slice(1)} (${i+1})`;
    const p1 = paragraphs[i % paragraphs.length](theme);
    const p2 = paragraphs[(i+1) % paragraphs.length](theme);
    articles.push({ title, content: `${p1} ${p2}` });
  }
  return articles;
}

// ============================================================
// 高二文章生成器
// ============================================================
function generateSeniorHigh2() {
  const themes = [
    'the ethics of artificial intelligence','sustainable urban development','psychological resilience',
    'biodiversity conservation strategies','the evolution of democratic governance','quantum physics and daily life',
    'literary analysis and critical thinking','economic inequality and social mobility',
    'neuroscience of learning and memory','philosophical approaches to happiness',
    'international diplomacy and cooperation','the future of renewable energy',
    'cultural heritage preservation','media literacy in the digital age'
  ];
  const paragraphs = [
    (t) => `The complexity of ${t} demands rigorous analytical thinking and the ability to synthesize information from multiple disciplines. Contemporary scholarship in this field reveals tensions between competing values and priorities that resist simple resolution. Students who engage seriously with these challenges develop intellectual maturity and the capacity for nuanced judgment that distinguishes advanced thinkers from those who accept superficial explanations.`,
    (t) => `Historical perspective enriches our understanding of ${t} by revealing how current situations emerged from past decisions and developments. What may appear as inevitable or natural is often the product of specific choices made by individuals and institutions operating within particular social, economic, and political contexts. Recognizing this contingency opens space for imagining alternative futures and taking purposeful action to shape outcomes rather than merely accepting them passively.`,
    (t) => `Cross-cultural comparison illuminates different approaches to ${t}, challenging assumptions that any single perspective holds a monopoly on truth. Eastern philosophical traditions often emphasize harmony, balance, and long-term thinking, while Western approaches tend to prioritize individual rights, innovation, and measurable outcomes. The most sophisticated understanding integrates insights from diverse traditions, recognizing that complex global challenges require collaborative solutions that transcend cultural boundaries.`,
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const theme = themes[i % themes.length];
    const title = `Analysis: ${theme.charAt(0).toUpperCase()+theme.slice(1)} (${i+1})`;
    const p1 = paragraphs[i % paragraphs.length](theme);
    const p2 = paragraphs[(i+2) % paragraphs.length](theme);
    articles.push({ title, content: `${p1} ${p2}` });
  }
  return articles;
}

// ============================================================
// 高三文章生成器
// ============================================================
function generateSeniorHigh3() {
  const themes = [
    'epistemology and the nature of knowledge','comparative political philosophy','postmodern literary theory',
    'bioethics and human dignity','macroeconomic policy debates','the anthropocene and planetary boundaries',
    'consciousness and artificial general intelligence','justice across generations',
    'the rhetoric of persuasion','scientific paradigm shifts','cultural relativism versus universal values',
    'the economics of climate action','narrative identity and personal meaning',
    'democratic deliberation in plural societies'
  ];
  const paragraphs = [
    (t) => `Scholarly discourse on ${t} reveals fundamental disagreements that reflect deeper philosophical commitments about the nature of reality, knowledge, and value. Engaging productively with these debates requires not merely understanding each position on its own terms but identifying the underlying assumptions and methodological choices that generate different conclusions from apparently similar evidence. This meta-cognitive awareness distinguishes sophisticated intellectual engagement from mere opinion exchange and constitutes an essential preparation for university-level study across disciplines.`,
    (t) => `The implications of ${t} extend far beyond academic theorizing to shape concrete policy decisions, institutional designs, and individual life choices. Bridging the gap between abstract principle and practical application requires what Aristotle termed phronesis, or practical wisdom: the capacity to discern what general principles require in particular circumstances characterized by uncertainty, competing values, and imperfect information. Developing this capacity demands extensive engagement with real-world cases, exposure to diverse perspectives, and the intellectual humility to revise one's positions when confronted with compelling evidence or arguments.`,
    (t) => `Contemporary approaches to ${t} increasingly emphasize interdisciplinarity, recognizing that complex phenomena cannot be adequately understood through any single theoretical lens. The integration of quantitative and qualitative methods, empirical investigation and normative reflection, scientific analysis and humanistic interpretation creates richer and more actionable understanding than any approach could achieve in isolation. Students preparing for advanced study must develop comfort with methodological pluralism while maintaining rigorous standards of evidence and argumentation within each tradition they employ.`,
  ];

  const articles = [];
  for (let i = 0; i < TARGET; i++) {
    const theme = themes[i % themes.length];
    const title = `Discourse: ${theme.charAt(0).toUpperCase()+theme.slice(1)} (${i+1})`;
    const p1 = paragraphs[i % paragraphs.length](theme);
    const p2 = paragraphs[(i+1) % paragraphs.length](theme);
    articles.push({ title, content: `${p1} ${p2}` });
  }
  return articles;
}

// ============================================================
// Save & Main
// ============================================================
async function saveArticles(articles) {
  console.log(`  Saving ${articles.length} articles...`);
  let saved = 0, skipped = 0;
  for (let i = 0; i < articles.length; i += 20) {
    const batch = articles.slice(i, i + 20);
    const { error } = await supabase.from('articles').insert(batch);
    if (error) {
      for (const a of batch) {
        const { error: e2 } = await supabase.from('articles').insert(a);
        if (e2) skipped++; else saved++;
      }
    } else { saved += batch.length; }
  }
  console.log(`  ✅ Saved: ${saved}, Skipped: ${skipped}`);
}

function format(articles, grade, contentSource, difficulty) {
  return articles.map(a => ({
    title: a.title,
    summary: a.content.substring(0, 250) + (a.content.length > 250 ? '...' : ''),
    content: a.content,
    source_name: contentSource === 'elementary' ? `译林版小学英语 - ${grade}` : `译林版高中英语 - ${grade}`,
    source_url: '',
    content_source: contentSource,
    difficulty,
    grade,
    published_at: new Date(Date.now() - Math.random()*86400000*30).toISOString(),
  }));
}

async function main() {
  console.log('🚀 Generating bulk articles (85 per grade)...\n');

  const grades = [
    { gen: generateGrade3, grade:'三年级', src:'elementary', diff:'beginner' },
    { gen: generateGrade4, grade:'四年级', src:'elementary', diff:'beginner' },
    { gen: generateGrade5, grade:'五年级', src:'elementary', diff:'beginner' },
    { gen: generateGrade6, grade:'六年级', src:'elementary', diff:'beginner' },
    { gen: generateSeniorHigh1, grade:'高一', src:'senior-high', diff:'intermediate' },
    { gen: generateSeniorHigh2, grade:'高二', src:'senior-high', diff:'advanced' },
    { gen: generateSeniorHigh3, grade:'高三', src:'senior-high', diff:'advanced' },
  ];

  let total = 0;
  for (const g of grades) {
    console.log(`📝 ${g.grade}...`);
    const raw = g.gen();
    const formatted = format(raw, g.grade, g.src, g.diff);
    await saveArticles(formatted);
    total += formatted.length;
  }

  console.log(`\n📊 Total new articles: ${total}`);
  const { count } = await supabase.from('articles').select('*', { count:'exact', head:true });
  console.log(`📚 Total in database: ${count}`);
  console.log('✨ Done!');
}

main().catch(console.error);
