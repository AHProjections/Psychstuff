/**
 * Biography Interview Question Bank
 *
 * Questions organized by life topic. Each topic has questions at different
 * depth levels. The detail_level chosen by the user determines which topics
 * and how many questions per topic are included.
 *
 * Detail levels:
 *   ultra_brief  - ~15 questions, 5 core topics  (~1 page / 500 words)
 *   brief        - ~35 questions, 8 topics        (~2-5 pages)
 *   moderate     - ~70 questions, all topics       (~10-20 pages)
 *   detailed     - ~120 questions, all + follow-ups (~20-50 pages)
 *   comprehensive - ~200 questions, everything      (~100+ pages)
 */

const TOPICS = [
  {
    id: 'basic_info',
    name: 'Basic Information',
    icon: 'user',
    description: 'Let\'s start with the basics about you.',
    minLevel: 'ultra_brief',
    questions: [
      { text: 'What is your full name? Were you named after anyone special?', depth: 1 },
      { text: 'When and where were you born?', depth: 1 },
      { text: 'What was your hometown like when you were growing up?', depth: 2 },
      { text: 'Do you have any nicknames? How did you get them?', depth: 3 },
      { text: 'What is your cultural or ethnic background, and what does it mean to you?', depth: 2 },
      { text: 'If someone asked you to describe yourself in a few sentences, what would you say?', depth: 4 },
    ],
  },
  {
    id: 'early_life',
    name: 'Early Life & Childhood',
    icon: 'baby',
    description: 'Tell me about your earliest years.',
    minLevel: 'ultra_brief',
    questions: [
      { text: 'What is your earliest memory?', depth: 1 },
      { text: 'Describe the home you grew up in. What did it look like and feel like?', depth: 2 },
      { text: 'What were your favorite things to do as a child?', depth: 1 },
      { text: 'Who was your best friend growing up, and what did you do together?', depth: 2 },
      { text: 'What were holidays and special occasions like in your family?', depth: 2 },
      { text: 'What is the most vivid memory from your childhood?', depth: 1 },
      { text: 'Were there any childhood experiences that shaped who you became?', depth: 3 },
      { text: 'What games or activities were popular when you were young?', depth: 3 },
      { text: 'What did your neighborhood look like? Who were your neighbors?', depth: 4 },
      { text: 'Did you have any pets growing up? Tell me about them.', depth: 3 },
      { text: 'What was your favorite food as a child? Did anyone special make it?', depth: 4 },
      { text: 'Were you ever in trouble as a kid? What happened?', depth: 4 },
      { text: 'What were bedtime routines like? Did anyone read to you or tell stories?', depth: 5 },
      { text: 'What smells, sounds, or sensations bring you right back to childhood?', depth: 5 },
    ],
  },
  {
    id: 'family_heritage',
    name: 'Family & Heritage',
    icon: 'family',
    description: 'Let\'s talk about your family.',
    minLevel: 'ultra_brief',
    questions: [
      { text: 'Tell me about your parents. What were they like?', depth: 1 },
      { text: 'Do you have brothers or sisters? What was your relationship like growing up?', depth: 1 },
      { text: 'Were there any family traditions that were important to your family?', depth: 2 },
      { text: 'Tell me about your grandparents. What do you remember about them?', depth: 2 },
      { text: 'What values did your family believe in most strongly?', depth: 2 },
      { text: 'Were there any family stories that were passed down through generations?', depth: 3 },
      { text: 'What did your parents do for a living? How did that affect family life?', depth: 3 },
      { text: 'How would you describe your family\'s financial situation growing up?', depth: 3 },
      { text: 'Were there any family members who had an especially big influence on you?', depth: 3 },
      { text: 'Do you know where your ancestors came from? What do you know about your family\'s history?', depth: 4 },
      { text: 'How did your family handle disagreements or difficult times?', depth: 4 },
      { text: 'What is the funniest family story you remember?', depth: 4 },
      { text: 'Were there any family recipes, songs, or customs that have been passed down?', depth: 5 },
      { text: 'How has your relationship with your family changed over the years?', depth: 5 },
    ],
  },
  {
    id: 'education',
    name: 'Education & Learning',
    icon: 'school',
    description: 'Tell me about your school years.',
    minLevel: 'brief',
    questions: [
      { text: 'Where did you go to school? What was it like?', depth: 1 },
      { text: 'What were your favorite subjects, and were there any teachers who made a big impression on you?', depth: 1 },
      { text: 'What is the most important thing school taught you — inside or outside the classroom?', depth: 2 },
      { text: 'Were there any struggles or triumphs during your school years?', depth: 2 },
      { text: 'Did you go to college or any training after high school? What was that experience like?', depth: 2 },
      { text: 'Were you involved in any sports, clubs, or activities at school?', depth: 3 },
      { text: 'What was the social scene like at your school? Who did you spend time with?', depth: 3 },
      { text: 'Is there anything you wish you had learned or studied?', depth: 4 },
      { text: 'Did any books, ideas, or courses change the way you think about the world?', depth: 4 },
      { text: 'How did your education prepare you — or not prepare you — for adult life?', depth: 5 },
      { text: 'Were there any moments in school that you still think about today?', depth: 5 },
    ],
  },
  {
    id: 'career',
    name: 'Career & Work',
    icon: 'briefcase',
    description: 'Let\'s talk about your working life.',
    minLevel: 'brief',
    questions: [
      { text: 'What was your first job? How did you get it?', depth: 1 },
      { text: 'What kind of work did you do for most of your life? What drew you to it?', depth: 1 },
      { text: 'What is the achievement you\'re most proud of in your career?', depth: 1 },
      { text: 'Were there people at work — bosses, coworkers, mentors — who really influenced you?', depth: 2 },
      { text: 'Was there a moment when your career took an unexpected turn?', depth: 2 },
      { text: 'What did you enjoy most about your work? What did you enjoy least?', depth: 3 },
      { text: 'How did you balance work with the rest of your life?', depth: 3 },
      { text: 'Did you ever consider a completely different career path?', depth: 3 },
      { text: 'What was the toughest challenge you faced at work, and how did you handle it?', depth: 4 },
      { text: 'If you could give career advice to a young person today, what would it be?', depth: 4 },
      { text: 'How did your work change over the decades? What changes in your field did you witness?', depth: 5 },
      { text: 'What does retirement look like for you — or what do you imagine it will be like?', depth: 5 },
    ],
  },
  {
    id: 'love_relationships',
    name: 'Love & Relationships',
    icon: 'heart',
    description: 'Tell me about the important relationships in your life.',
    minLevel: 'brief',
    questions: [
      { text: 'How did you meet the most important person in your life? What drew you to them?', depth: 1 },
      { text: 'Can you tell me about your wedding day or the day you committed to your partner?', depth: 2 },
      { text: 'What do you think makes a relationship last?', depth: 1 },
      { text: 'What is your happiest memory with your partner?', depth: 2 },
      { text: 'Who have been your closest friends throughout life? What made those friendships special?', depth: 2 },
      { text: 'Have you ever lost someone you loved deeply? How did you cope?', depth: 3 },
      { text: 'What has love taught you over the years?', depth: 3 },
      { text: 'Were there relationships that changed you as a person?', depth: 4 },
      { text: 'How have your ideas about love changed from when you were young to now?', depth: 4 },
      { text: 'What is the kindest thing someone has ever done for you?', depth: 5 },
      { text: 'Is there anything you wish you had said to someone but never got the chance?', depth: 5 },
    ],
  },
  {
    id: 'children_parenting',
    name: 'Children & Parenting',
    icon: 'baby-carriage',
    description: 'Tell me about your experience as a parent (or about the children in your life).',
    minLevel: 'moderate',
    questions: [
      { text: 'Do you have children? Tell me about them.', depth: 1 },
      { text: 'What was it like becoming a parent for the first time?', depth: 2 },
      { text: 'What is your proudest moment as a parent?', depth: 2 },
      { text: 'What was your approach to parenting? Was it similar to how you were raised?', depth: 3 },
      { text: 'What are some of your favorite memories with your children?', depth: 3 },
      { text: 'What did you learn from your children that surprised you?', depth: 3 },
      { text: 'How has your relationship with your children changed as they\'ve grown?', depth: 4 },
      { text: 'Do you have grandchildren? What is that experience like?', depth: 4 },
      { text: 'If you could pass on one lesson to your children and grandchildren, what would it be?', depth: 4 },
      { text: 'What traditions have you started or continued with your family?', depth: 5 },
      { text: 'What do you hope your children and grandchildren remember most about you?', depth: 5 },
    ],
  },
  {
    id: 'hobbies_passions',
    name: 'Hobbies & Passions',
    icon: 'palette',
    description: 'What do you love to do?',
    minLevel: 'moderate',
    questions: [
      { text: 'What hobbies or interests have you enjoyed throughout your life?', depth: 1 },
      { text: 'Is there a skill or talent you\'re particularly proud of?', depth: 2 },
      { text: 'How did you first get into your favorite hobby or activity?', depth: 2 },
      { text: 'Have your interests changed over the years, or have some stayed constant?', depth: 3 },
      { text: 'Did any of your hobbies lead to unexpected friendships or experiences?', depth: 3 },
      { text: 'What creative pursuits have been meaningful to you — music, art, writing, crafts?', depth: 4 },
      { text: 'Is there something you always wanted to learn but never got around to?', depth: 4 },
      { text: 'What activities bring you the most joy or peace right now?', depth: 5 },
    ],
  },
  {
    id: 'achievements',
    name: 'Achievements & Milestones',
    icon: 'trophy',
    description: 'What are you most proud of?',
    minLevel: 'moderate',
    questions: [
      { text: 'What accomplishment in your life are you most proud of?', depth: 1 },
      { text: 'Was there a success that surprised you or that you didn\'t expect?', depth: 2 },
      { text: 'Have you received any awards, honors, or special recognition?', depth: 3 },
      { text: 'What personal milestone meant the most to you?', depth: 3 },
      { text: 'Is there something you accomplished that others might not know about?', depth: 4 },
      { text: 'What obstacles did you overcome to achieve something important?', depth: 4 },
      { text: 'How do you define success in your own life?', depth: 5 },
    ],
  },
  {
    id: 'challenges',
    name: 'Challenges & Resilience',
    icon: 'mountain',
    description: 'Life isn\'t always easy. Tell me about the tough times.',
    minLevel: 'brief',
    questions: [
      { text: 'What has been the greatest challenge you\'ve faced in your life?', depth: 1 },
      { text: 'How did you get through the most difficult times?', depth: 1 },
      { text: 'What gave you strength or hope when things were hard?', depth: 2 },
      { text: 'Is there a lesson you learned from a difficult experience that you carry with you?', depth: 2 },
      { text: 'Was there a moment you thought you couldn\'t go on, but you did?', depth: 3 },
      { text: 'Did any hardship end up leading to something positive?', depth: 3 },
      { text: 'How did your struggles shape the person you are today?', depth: 4 },
      { text: 'What would you tell someone going through a similar challenge?', depth: 4 },
      { text: 'Were there people who helped you through your hardest times? Who were they?', depth: 5 },
    ],
  },
  {
    id: 'faith_values',
    name: 'Faith & Values',
    icon: 'compass',
    description: 'What do you believe in?',
    minLevel: 'moderate',
    questions: [
      { text: 'What are the core values that have guided your life?', depth: 1 },
      { text: 'Do you have a spiritual or religious faith? How has it shaped your life?', depth: 2 },
      { text: 'Has your philosophy of life changed over the years?', depth: 2 },
      { text: 'Was there a moment or experience that deepened or changed your beliefs?', depth: 3 },
      { text: 'What does living a good life mean to you?', depth: 3 },
      { text: 'How have your values influenced the choices you\'ve made?', depth: 4 },
      { text: 'Is there a quote, prayer, or saying that has been meaningful to you?', depth: 5 },
      { text: 'What do you think happens after we die?', depth: 5 },
    ],
  },
  {
    id: 'travel_adventures',
    name: 'Travel & Adventures',
    icon: 'globe',
    description: 'Where has life taken you?',
    minLevel: 'moderate',
    questions: [
      { text: 'What has been your favorite place you\'ve ever visited?', depth: 1 },
      { text: 'Tell me about the most memorable trip or adventure you\'ve had.', depth: 2 },
      { text: 'Have you ever lived anywhere other than where you grew up?', depth: 2 },
      { text: 'Is there a place you\'ve always wanted to go but haven\'t yet?', depth: 3 },
      { text: 'What is the most adventurous thing you\'ve ever done?', depth: 3 },
      { text: 'Did any journey or trip change your perspective on life?', depth: 4 },
      { text: 'What places feel like home to you, and why?', depth: 5 },
    ],
  },
  {
    id: 'historical_moments',
    name: 'Historical Moments',
    icon: 'clock',
    description: 'You\'ve lived through some remarkable times.',
    minLevel: 'detailed',
    questions: [
      { text: 'What major world event do you remember most vividly? Where were you when it happened?', depth: 2 },
      { text: 'How have you seen the world change during your lifetime?', depth: 2 },
      { text: 'What invention or technological change has had the biggest impact on your life?', depth: 3 },
      { text: 'Were there historical events that directly affected you or your family?', depth: 3 },
      { text: 'What changes in society have made you proud? What changes concern you?', depth: 4 },
      { text: 'If you could tell a young person one thing about what life was like in your era, what would it be?', depth: 4 },
      { text: 'How have cultural norms and expectations changed from when you were young?', depth: 5 },
      { text: 'What do you think the world has gotten better at? What has it gotten worse at?', depth: 5 },
    ],
  },
  {
    id: 'daily_life',
    name: 'Daily Life & Routines',
    icon: 'sun',
    description: 'Tell me about everyday life.',
    minLevel: 'detailed',
    questions: [
      { text: 'Describe a typical day in your life right now.', depth: 3 },
      { text: 'What does a perfect day look like for you?', depth: 3 },
      { text: 'What small pleasures do you enjoy most?', depth: 4 },
      { text: 'What are your favorite foods or meals?', depth: 4 },
      { text: 'Do you have any daily rituals or routines that are important to you?', depth: 4 },
      { text: 'What music, books, movies, or shows do you enjoy?', depth: 5 },
      { text: 'How has your daily life changed from when you were younger?', depth: 5 },
    ],
  },
  {
    id: 'reflections',
    name: 'Life Reflections',
    icon: 'sunset',
    description: 'Looking back on your life...',
    minLevel: 'ultra_brief',
    questions: [
      { text: 'If you could go back and give your younger self one piece of advice, what would it be?', depth: 1 },
      { text: 'What are you most grateful for in your life?', depth: 1 },
      { text: 'Is there anything you would do differently if you could?', depth: 2 },
      { text: 'What do you think is the most important thing in life?', depth: 2 },
      { text: 'What makes you laugh the most?', depth: 3 },
      { text: 'What has surprised you most about getting older?', depth: 3 },
      { text: 'What do you know now that you wish you knew at 20?', depth: 4 },
      { text: 'What moments in your life would you want to relive?', depth: 4 },
      { text: 'How would you describe the theme or story of your life?', depth: 5 },
    ],
  },
  {
    id: 'legacy',
    name: 'Legacy & Messages',
    icon: 'scroll',
    description: 'What do you want the world to remember?',
    minLevel: 'ultra_brief',
    questions: [
      { text: 'What do you want your family to know about you and your life?', depth: 1 },
      { text: 'What advice would you give to the next generation?', depth: 1 },
      { text: 'How would you like to be remembered?', depth: 2 },
      { text: 'Is there a message you\'d like to leave for your grandchildren or great-grandchildren?', depth: 2 },
      { text: 'What do you hope your legacy will be?', depth: 3 },
      { text: 'If you could write one final chapter of your story, what would you want it to say?', depth: 3 },
      { text: 'What values or traditions do you most hope will carry on after you?', depth: 4 },
      { text: 'Is there anything else you\'d like to share that we haven\'t talked about?', depth: 5 },
    ],
  },
];

// Maps detail_level to max question depth and which topics to include
const LEVEL_CONFIG = {
  ultra_brief: {
    maxDepth: 1,
    label: 'Ultra Brief',
    description: 'About 1 page — just the highlights',
    pageEstimate: '~1 page',
  },
  brief: {
    maxDepth: 2,
    label: 'Brief',
    description: 'About 2-5 pages — key moments and memories',
    pageEstimate: '2-5 pages',
  },
  moderate: {
    maxDepth: 3,
    label: 'Moderate',
    description: 'About 10-20 pages — a well-rounded life story',
    pageEstimate: '10-20 pages',
  },
  detailed: {
    maxDepth: 4,
    label: 'Detailed',
    description: 'About 20-50 pages — rich detail and context',
    pageEstimate: '20-50 pages',
  },
  comprehensive: {
    maxDepth: 5,
    label: 'Comprehensive',
    description: '50-100+ pages — the full story of a life',
    pageEstimate: '50-100+ pages',
  },
};

const LEVEL_ORDER = ['ultra_brief', 'brief', 'moderate', 'detailed', 'comprehensive'];

/**
 * Get the question plan for a given detail level.
 * Returns topics (in order) with their filtered questions.
 */
function getQuestionPlan(detailLevel) {
  const config = LEVEL_CONFIG[detailLevel];
  if (!config) throw new Error(`Unknown detail level: ${detailLevel}`);

  const levelIndex = LEVEL_ORDER.indexOf(detailLevel);

  return TOPICS
    .filter(topic => {
      const topicMinIndex = LEVEL_ORDER.indexOf(topic.minLevel);
      return topicMinIndex <= levelIndex;
    })
    .map(topic => ({
      id: topic.id,
      name: topic.name,
      icon: topic.icon,
      description: topic.description,
      questions: topic.questions
        .filter(q => q.depth <= config.maxDepth)
        .map(q => q.text),
    }));
}

/**
 * Get all available detail levels with their metadata.
 */
function getDetailLevels() {
  return Object.entries(LEVEL_CONFIG).map(([key, config]) => ({
    id: key,
    ...config,
  }));
}

/**
 * Count total questions for a given detail level.
 */
function countQuestions(detailLevel) {
  const plan = getQuestionPlan(detailLevel);
  return plan.reduce((sum, topic) => sum + topic.questions.length, 0);
}

module.exports = { getQuestionPlan, getDetailLevels, countQuestions, TOPICS, LEVEL_CONFIG };
