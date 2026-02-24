/**
 * Biography Draft Generator
 *
 * Takes organized interview responses and generates a readable biography
 * narrative using template-based prose generation.
 */

const { LEVEL_CONFIG } = require('./biography-questions');

// Topic-specific opening phrases for narrative flow
const TOPIC_OPENERS = {
  basic_info: (name) => ``,
  early_life: (name) => `\n## Early Life & Childhood\n\n`,
  family_heritage: (name) => `\n## Family & Heritage\n\n`,
  education: (name) => `\n## Education\n\n`,
  career: (name) => `\n## Career & Work\n\n`,
  love_relationships: (name) => `\n## Love & Relationships\n\n`,
  children_parenting: (name) => `\n## Children & Parenting\n\n`,
  hobbies_passions: (name) => `\n## Hobbies & Passions\n\n`,
  achievements: (name) => `\n## Achievements & Milestones\n\n`,
  challenges: (name) => `\n## Challenges & Resilience\n\n`,
  faith_values: (name) => `\n## Faith & Values\n\n`,
  travel_adventures: (name) => `\n## Travel & Adventures\n\n`,
  historical_moments: (name) => `\n## A Life in History\n\n`,
  daily_life: (name) => `\n## Daily Life\n\n`,
  reflections: (name) => `\n## Reflections\n\n`,
  legacy: (name) => `\n## Legacy\n\n`,
};

/**
 * Generate a biography draft from session data.
 *
 * @param {Object} session - The biography session record
 * @param {Array} responses - Array of { topic, question, answer } objects
 * @returns {string} The generated biography in Markdown format
 */
function generateDraft(session, responses) {
  const name = session.subject_name;
  const firstName = name.split(' ')[0];
  const level = session.detail_level;
  const isShort = level === 'ultra_brief' || level === 'brief';

  // Group responses by topic, preserving topic order
  const byTopic = {};
  for (const r of responses) {
    if (!byTopic[r.topic]) byTopic[r.topic] = [];
    byTopic[r.topic].push(r);
  }

  const topicOrder = [
    'basic_info', 'early_life', 'family_heritage', 'education', 'career',
    'love_relationships', 'children_parenting', 'hobbies_passions',
    'achievements', 'challenges', 'faith_values', 'travel_adventures',
    'historical_moments', 'daily_life', 'reflections', 'legacy',
  ];

  let draft = '';

  // Title
  draft += `# The Life of ${name}\n\n`;
  draft += `*A biographical narrative based on a personal interview.*\n\n`;
  draft += `---\n`;

  // Generate introduction from basic_info
  const basicResponses = byTopic['basic_info'] || [];
  if (basicResponses.length > 0) {
    draft += `\n## Introduction\n\n`;
    draft += weaveResponses(basicResponses, firstName, isShort);
  }

  // Generate each topic section
  for (const topicId of topicOrder) {
    if (topicId === 'basic_info') continue; // already handled
    const topicResponses = byTopic[topicId];
    if (!topicResponses || topicResponses.length === 0) continue;

    const opener = TOPIC_OPENERS[topicId];
    if (opener) {
      draft += opener(firstName);
    } else {
      draft += `\n## ${topicId}\n\n`;
    }

    draft += weaveResponses(topicResponses, firstName, isShort);
  }

  // Closing
  draft += `\n---\n\n`;
  if (byTopic['legacy'] && byTopic['legacy'].length > 0) {
    draft += `*This biography was created from a personal interview with ${name}.*\n`;
  } else {
    draft += `*This biography was created from a personal interview with ${name}. `;
    draft += `The story continues to unfold.*\n`;
  }

  return draft;
}

/**
 * Weave a set of Q&A responses into narrative prose.
 * For shorter biographies, keep it concise. For longer ones, include
 * the questions as context and expand the narrative.
 */
function weaveResponses(responses, firstName, isShort) {
  let text = '';

  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const answer = r.answer.trim();

    if (!answer) continue;

    if (isShort) {
      // For short biographies: just the answers with light connecting tissue
      if (i > 0) text += ' ';
      text += answer;
      if (!answer.endsWith('.') && !answer.endsWith('!') && !answer.endsWith('?')) {
        text += '.';
      }
    } else {
      // For longer biographies: include context and formatting
      if (i > 0) text += '\n\n';

      // Use the question as a subtle lead-in for context
      const questionContext = getQuestionContext(r.question);
      if (questionContext && i > 0) {
        text += questionContext + ' ';
      }

      text += answer;
      if (!answer.endsWith('.') && !answer.endsWith('!') && !answer.endsWith('?')) {
        text += '.';
      }
    }
  }

  text += '\n';
  return text;
}

/**
 * Extract a brief contextual phrase from a question to use as
 * a narrative lead-in. Returns empty string if no good lead-in.
 */
function getQuestionContext(question) {
  // Map common question patterns to narrative lead-ins
  const patterns = [
    [/earliest memory/i, 'Looking back to the earliest memories,'],
    [/favorite things to do/i, 'When it came to favorite pastimes,'],
    [/best friend/i, 'On the topic of childhood friendships,'],
    [/holidays|special occasions/i, 'When holidays and special occasions came around,'],
    [/most vivid memory/i, 'One memory stands out above the rest:'],
    [/parents/i, 'Speaking of family,'],
    [/brothers or sisters|siblings/i, 'Regarding siblings,'],
    [/grandparents/i, 'The grandparents also played a role:'],
    [/school/i, 'When it came to education,'],
    [/first job/i, 'The working years began early:'],
    [/career|work.*life/i, 'Career-wise,'],
    [/proud/i, 'With pride,'],
    [/met.*partner|important person/i, 'In matters of the heart,'],
    [/wedding/i, 'The wedding day was memorable:'],
    [/children|parent/i, 'As for family life,'],
    [/hobby|hobbies|interests/i, 'Beyond work and family,'],
    [/challenge|difficult/i, 'Life was not without its challenges:'],
    [/strength|hope/i, 'Through it all,'],
    [/values|believe/i, 'At the core,'],
    [/travel|visited|trip/i, 'Travel brought its own adventures:'],
    [/world event|history/i, 'Living through history,'],
    [/grateful/i, 'With deep gratitude,'],
    [/advice|younger self/i, 'With the wisdom of years,'],
    [/remembered|legacy/i, 'Looking toward the future,'],
  ];

  for (const [pattern, leadIn] of patterns) {
    if (pattern.test(question)) {
      return leadIn;
    }
  }

  return '';
}

module.exports = { generateDraft };
