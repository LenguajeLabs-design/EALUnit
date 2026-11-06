import type { Blueprint, Context } from './model';

export const exampleContext: Context = {
  title: 'How characters change',
  grade: 'Grade 4',
  strand: 'Reading',
  durationWeeks: 3,
  sessionMinutes: 35,
  curriculum:
    'Readers explain how a character changes across a story, using relevant details as evidence. During workshop, students discuss important moments with a partner, compare a character’s earlier and later actions, and write a short explanation connecting an interpretation to the text. Teachers choose the shared and independent reading texts.',
  groupContext:
    'Fictional planning group: students can retell key events using talk, gesture, and their available languages. Recent discussion suggests they need opportunities to connect an interpretation to a relevant detail and rehearse time and contrast language.',
};

export function exampleBlueprint(): Blueprint {
  const origin = 'example' as const;
  const reviewStatus = 'unreviewed' as const;
  return {
    summary:
      'Help readers move from noticing a character’s actions to explaining change with evidence. Protected EAL time makes space to rehearse the language of comparison, interpretation, and explanation before students use it in workshop.',
    goals: [
      {
        id: 'content-1',
        kind: 'content',
        text: 'Explain how a character changes across a story, using relevant details to support an interpretation.',
        origin,
        reviewStatus,
      },
      {
        id: 'language-1',
        kind: 'language',
        text: 'Compare earlier and later actions using time and contrast language that makes the change clear.',
        origin,
        reviewStatus,
      },
      {
        id: 'language-2',
        kind: 'language',
        text: 'Connect an interpretation to a relevant story detail and explain how that detail supports the idea.',
        origin,
        reviewStatus,
      },
    ],
    demands: [
      {
        id: 'demand-1',
        text: 'Understand what a character’s actions and words suggest in a shared scene.',
        domain: 'Understanding',
        priority: 'Support participation',
        origin,
        reviewStatus,
      },
      {
        id: 'demand-2',
        text: 'Compare earlier and later behavior using phrases such as at first, later, and although.',
        domain: 'Expression',
        priority: 'Teach explicitly',
        origin,
        reviewStatus,
      },
      {
        id: 'demand-3',
        text: 'Explain the relationship between an idea and a specific detail, rather than only naming evidence.',
        domain: 'Expression',
        priority: 'Teach explicitly',
        origin,
        reviewStatus,
      },
      {
        id: 'demand-4',
        text: 'Respond to a partner’s interpretation by asking for a detail or offering another reading.',
        domain: 'Interaction',
        priority: 'Support participation',
        origin,
        reviewStatus,
      },
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Notice actions and feelings',
        workshopTask: 'Identify an important moment in a shared story scene.',
        languageFocus:
          'Describe what a character does and suggest a possible feeling or intention.',
        goalIds: ['content-1'],
        prerequisiteIds: [],
        evidence:
          'Notice whether students distinguish what the character does from their interpretation, using any available communication resources.',
        transfer: 'Choose an important moment in the workshop text and explain why it matters.',
        supports: [
          'An accessible shared scene with visual context',
          'Home-language discussion, sketches, and partner talk',
        ],
        origin,
        reviewStatus,
      },
      {
        id: 'step-2',
        title: 'Compare then and now',
        workshopTask: 'Compare a character’s actions at two points in the story.',
        languageFocus: 'Use time and contrast language to make a change in behavior clear.',
        goalIds: ['content-1', 'language-1'],
        prerequisiteIds: ['step-1'],
        evidence:
          'Listen for a meaningful comparison of two moments, rather than the use of a connector alone.',
        transfer: 'Explain a character’s change in a workshop partner discussion.',
        supports: ['A two-moment visual timeline', 'Optional time and contrast phrases'],
        origin,
        reviewStatus,
      },
      {
        id: 'step-3',
        title: 'Connect an idea to evidence',
        workshopTask: 'Select a detail that supports an interpretation of the character.',
        languageFocus: 'Explain how an action or line of dialogue supports an idea.',
        goalIds: ['content-1', 'language-2'],
        prerequisiteIds: ['step-1', 'step-2'],
        evidence:
          'Ask students to explain why their chosen detail supports the interpretation. Note the prompting required.',
        transfer:
          'Support a reading response with a relevant detail and an explanation of its meaning.',
        supports: ['Two possible details to compare', 'Oral rehearsal before writing'],
        origin,
        reviewStatus,
      },
      {
        id: 'step-4',
        title: 'Shape a connected explanation',
        workshopTask: 'Organize a response about character change for a reader.',
        languageFocus:
          'Connect the comparison, interpretation, and supporting detail into a coherent explanation.',
        goalIds: ['language-1', 'language-2'],
        prerequisiteIds: ['step-2', 'step-3'],
        evidence:
          'Collect a short oral or written explanation and note which connections students make independently.',
        transfer: 'Write a workshop response using student-chosen evidence and wording.',
        supports: ['A short, discussed model', 'Co-created criteria and optional oral rehearsal'],
        origin,
        reviewStatus,
      },
      {
        id: 'step-5',
        title: 'Transfer to a new moment',
        workshopTask: 'Explain change in a different scene or character.',
        languageFocus: 'Choose language and evidence flexibly for a new interpretation.',
        goalIds: ['content-1', 'language-1', 'language-2'],
        prerequisiteIds: ['step-3', 'step-4'],
        evidence:
          'Compare the independence and quality of meaning-making in a new response. Reduce support only when the new evidence warrants it.',
        transfer: 'Use the approach with a new workshop text or character.',
        supports: [
          'Keep reference tools available by choice',
          'Use a focused conference only where needed',
        ],
        origin,
        reviewStatus,
      },
    ],
    assumptions: [
      'The teacher will select suitable shared scenes and workshop texts.',
      'The three-week duration and 35-minute sessions are illustrative; learning steps may span several lessons.',
    ],
    questions: [
      'Which texts and scenes will students use?',
      'What does a recent oral or written response show about the group’s starting point?',
    ],
  };
}

export function blankBlueprint(): Blueprint {
  return {
    summary: '',
    goals: [
      { id: 'content-1', kind: 'content', text: '', origin: 'outline', reviewStatus: 'unreviewed' },
      {
        id: 'language-1',
        kind: 'language',
        text: '',
        origin: 'outline',
        reviewStatus: 'unreviewed',
      },
    ],
    demands: [],
    steps: [
      {
        id: 'step-1',
        title: 'First learning step',
        workshopTask: '',
        languageFocus: '',
        goalIds: ['content-1', 'language-1'],
        prerequisiteIds: [],
        evidence: '',
        transfer: '',
        supports: [],
        origin: 'outline',
        reviewStatus: 'unreviewed',
      },
    ],
    assumptions: [],
    questions: [],
  };
}
