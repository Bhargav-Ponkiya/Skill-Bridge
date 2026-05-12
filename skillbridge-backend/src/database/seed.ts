import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from '../modules/user/user.entity';
import {
  Skill,
  SkillType,
  ProficiencyLevel,
} from '../modules/skill/skill.entity';
import {
  MatchRequest,
  MatchRequestStatus,
} from '../modules/match/match-request.entity';
import {
  Session,
  SessionStatus,
  SessionFormat,
} from '../modules/session/session.entity';
import { Message } from '../modules/message/message.entity';
import { hash } from 'bcryptjs';

const USERS = [
  {
    email: 'user1@test.com',
    name: 'user1',
    teaches: ['React', 'TypeScript'],
    wants: ['Python', 'DevOps'],
  },
  {
    email: 'user2@test.com',
    name: 'user2',
    teaches: ['Python', 'Machine Learning'],
    wants: ['React', 'UI/UX'],
  },
  {
    email: 'user3@test.com',
    name: 'user3',
    teaches: ['Node.js', 'DevOps'],
    wants: ['Machine Learning', 'TypeScript', 'UI/UX'],
  },
  {
    email: 'user4@test.com',
    name: 'user4',
    teaches: ['UI/UX', 'Figma'],
    wants: ['Node.js', 'React'],
  },
  {
    email: 'user5@test.com',
    name: 'user5',
    teaches: ['Java', 'Spring Boot'],
    wants: ['Python', 'DevOps'],
  },
];

const SKILL_META: Record<
  string,
  { category: string; level: ProficiencyLevel; description: string }
> = {
  React: {
    category: 'Frontend',
    level: ProficiencyLevel.EXPERT,
    description: 'Component design, hooks, state management with Redux/Zustand',
  },
  TypeScript: {
    category: 'Languages',
    level: ProficiencyLevel.EXPERT,
    description: 'Advanced generics, utility types, strict mode patterns',
  },
  Python: {
    category: 'Languages',
    level: ProficiencyLevel.EXPERT,
    description: 'Scripting, data analysis, Flask/FastAPI, async programming',
  },
  DevOps: {
    category: 'Infrastructure',
    level: ProficiencyLevel.INTERMEDIATE,
    description: 'Docker, CI/CD pipelines, Kubernetes basics, AWS/GCP',
  },
  'Machine Learning': {
    category: 'Data Science',
    level: ProficiencyLevel.EXPERT,
    description: 'Scikit-learn, TensorFlow, model training & evaluation',
  },
  'UI/UX': {
    category: 'Design',
    level: ProficiencyLevel.EXPERT,
    description: 'User research, wireframing, prototyping, usability testing',
  },
  Figma: {
    category: 'Design',
    level: ProficiencyLevel.EXPERT,
    description: 'Auto layout, components, design systems, prototyping',
  },
  'Node.js': {
    category: 'Backend',
    level: ProficiencyLevel.EXPERT,
    description: 'Express/NestJS, REST APIs, authentication, microservices',
  },
  Java: {
    category: 'Languages',
    level: ProficiencyLevel.EXPERT,
    description: 'OOP, concurrency, Spring ecosystem, design patterns',
  },
  'Spring Boot': {
    category: 'Backend',
    level: ProficiencyLevel.EXPERT,
    description: 'REST APIs, JPA/Hibernate, security, actuator',
  },
};

const FUTURE_DATE = new Date();
FUTURE_DATE.setDate(FUTURE_DATE.getDate() + 3);
FUTURE_DATE.setHours(14, 0, 0, 0);

const PAST_DATE = new Date();
PAST_DATE.setDate(PAST_DATE.getDate() - 7);

async function seed() {
  console.log('Connecting to database...');
  const ds = await AppDataSource.initialize();
  console.log('Connected.');

  const repo = {
    users: ds.getRepository(User),
    skills: ds.getRepository(Skill),
    matchRequests: ds.getRepository(MatchRequest),
    sessions: ds.getRepository(Session),
    messages: ds.getRepository(Message),
  };

  // Clean in reverse dependency order
  console.log('Cleaning tables...');
  await ds.query('DELETE FROM messages');
  await ds.query('DELETE FROM reviews');
  await ds.query('DELETE FROM notifications');
  await ds.query('DELETE FROM portfolios');
  await ds.query('DELETE FROM sessions');
  await ds.query('DELETE FROM match_requests');
  await ds.query('DELETE FROM skills');
  await ds.query('DELETE FROM users');
  console.log('Tables cleaned.');

  // Create users
  const passwordHash = await hash('password123', 10);
  console.log('Creating users...');
  const userRecords: Record<string, User> = {};
  for (const u of USERS) {
    const user = repo.users.create({
      email: u.email,
      name: u.name,
      passwordHash,
      bio: `Passionate about ${u.teaches.join(' & ')} and eager to learn ${u.wants.join(' & ')}.`,
      timezone: 'UTC',
      isVerified: true,
    });
    userRecords[u.email] = await repo.users.save(user);
    console.log(`  Created ${u.email}`);
  }

  // Create skills
  console.log('Creating skills...');
  const skillRecords: Record<string, Skill> = {};
  for (const u of USERS) {
    const user = userRecords[u.email];

    for (const title of u.teaches) {
      const meta = SKILL_META[title];
      const skill = repo.skills.create({
        userId: user.id,
        title,
        category: meta.category,
        type: SkillType.OFFER,
        proficiencyLevel: meta.level,
        description: meta.description,
      });
      const saved = await repo.skills.save(skill);
      skillRecords[`${user.email}:${title}`] = saved;
    }

    for (const title of u.wants) {
      const meta = SKILL_META[title] ?? {
        category: 'General',
        level: ProficiencyLevel.BEGINNER,
        description: `Looking to learn ${title}`,
      };
      const skill = repo.skills.create({
        userId: user.id,
        title,
        category: meta.category,
        type: SkillType.WANT,
        proficiencyLevel: meta.level,
        description: meta.description,
      });
      const saved = await repo.skills.save(skill);
      skillRecords[`${user.email}:${title}`] = saved;
    }
  }
  console.log(`  Created ${Object.keys(skillRecords).length} skills.`);

  // ──────────────────────────────────────────────
  // SESSION 1: NEGOTIATING  (user1 ↔ user2)
  // Test: ScheduleCard, Start button, ChatWindow
  // ──────────────────────────────────────────────
  console.log('Creating match request: user1 -> user2...');
  const u1u2Request = repo.matchRequests.create({
    fromUserId: userRecords['user1@test.com'].id,
    toUserId: userRecords['user2@test.com'].id,
    offeredSkillId: skillRecords['user1@test.com:React'].id,
    wantedSkillId: skillRecords['user1@test.com:Python'].id,
    offeredSkillSnapshot: {
      title: 'React',
      description: 'Component design, hooks, state management',
      level: 'EXPERT',
    },
    wantedSkillSnapshot: {
      title: 'Python',
      description: 'Scripting, data analysis, Flask/FastAPI',
      level: 'EXPERT',
    },
    status: MatchRequestStatus.ACCEPTED,
    message:
      'Hey! I see you want to learn React. I can help with that if you teach me Python!',
  });
  await repo.matchRequests.save(u1u2Request);

  console.log('  Creating NEGOTIATING session (user1 ↔ user2)...');
  const sessionNegotiating = repo.sessions.create({
    matchRequestId: u1u2Request.id,
    participant1Id: userRecords['user1@test.com'].id,
    participant2Id: userRecords['user2@test.com'].id,
    skill1Id: skillRecords['user1@test.com:React'].id,
    skill2Id: skillRecords['user2@test.com:Python'].id,
    status: SessionStatus.NEGOTIATING,
    duration: 60,
    format: SessionFormat.VIDEO,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  });
  await repo.sessions.save(sessionNegotiating);

  // Chat messages in the NEGOTIATING session
  const negotiatingMessages = [
    {
      senderId: userRecords['user1@test.com'].id,
      content: 'Hi! Excited to learn Python with you. When are you free?',
    },
    {
      senderId: userRecords['user2@test.com'].id,
      content: "Hey! I'm available weekdays after 6pm UTC. Does that work?",
    },
    {
      senderId: userRecords['user1@test.com'].id,
      content:
        "Perfect! Let's start with React fundamentals and I'll get Python basics from you.",
    },
    {
      senderId: userRecords['user2@test.com'].id,
      content:
        "Sounds like a plan. I've set up a meeting link for our first session.",
    },
  ];
  for (const m of negotiatingMessages) {
    await repo.messages.save(
      repo.messages.create({
        sessionId: sessionNegotiating.id,
        senderId: m.senderId,
        content: m.content,
      }),
    );
  }
  console.log(`  Created ${negotiatingMessages.length} chat messages.`);

  // ──────────────────────────────────────────────
  // SESSION 2: SCHEDULED  (user3 ↔ user5)
  // Test: ActionRow "Start Session" button, ICS download, Mark Complete
  // ──────────────────────────────────────────────
  console.log('Creating match request: user3 -> user5...');
  const u3u5Request = repo.matchRequests.create({
    fromUserId: userRecords['user3@test.com'].id,
    toUserId: userRecords['user5@test.com'].id,
    offeredSkillId: skillRecords['user3@test.com:DevOps'].id,
    wantedSkillId: skillRecords['user3@test.com:TypeScript'].id,
    offeredSkillSnapshot: {
      title: 'DevOps',
      description: 'Docker, CI/CD pipelines, Kubernetes basics',
      level: 'INTERMEDIATE',
    },
    wantedSkillSnapshot: {
      title: 'TypeScript',
      description: 'Advanced generics, utility types, strict mode patterns',
      level: 'EXPERT',
    },
    status: MatchRequestStatus.ACCEPTED,
    message: 'DevOps for TypeScript? Sounds like a great trade!',
  });
  await repo.matchRequests.save(u3u5Request);

  console.log('  Creating SCHEDULED session (user3 ↔ user5)...');
  const sessionScheduled = repo.sessions.create({
    matchRequestId: u3u5Request.id,
    participant1Id: userRecords['user3@test.com'].id,
    participant2Id: userRecords['user5@test.com'].id,
    skill1Id: skillRecords['user3@test.com:DevOps'].id,
    skill2Id: skillRecords['user5@test.com:Java'].id,
    status: SessionStatus.SCHEDULED,
    scheduledAt: FUTURE_DATE,
    duration: 90,
    format: SessionFormat.VIDEO,
    meetingLink: 'https://meet.google.com/xyz-uvw-rst',
  });
  await repo.sessions.save(sessionScheduled);

  // Chat messages in the SCHEDULED session
  const scheduledMessages = [
    {
      senderId: userRecords['user3@test.com'].id,
      content: 'Thanks for scheduling! I have prepared some DevOps materials.',
    },
    {
      senderId: userRecords['user5@test.com'].id,
      content: "Great! I'll walk you through Java basics. See you on the call.",
    },
  ];
  for (const m of scheduledMessages) {
    await repo.messages.save(
      repo.messages.create({
        sessionId: sessionScheduled.id,
        senderId: m.senderId,
        content: m.content,
      }),
    );
  }
  console.log(`  Created ${scheduledMessages.length} chat messages.`);

  // ──────────────────────────────────────────────
  // SESSION 3: COMPLETED  (user4 ↔ user2)
  // Test: Review form, SummaryPanel, AI Roadmap/Resources
  // ──────────────────────────────────────────────
  console.log('Creating match request: user4 -> user2...');
  const u4u2Request = repo.matchRequests.create({
    fromUserId: userRecords['user4@test.com'].id,
    toUserId: userRecords['user2@test.com'].id,
    offeredSkillId: skillRecords['user4@test.com:UI/UX'].id,
    wantedSkillId: skillRecords['user4@test.com:React'].id,
    offeredSkillSnapshot: {
      title: 'UI/UX',
      description: 'User research, wireframing, prototyping',
      level: 'EXPERT',
    },
    wantedSkillSnapshot: {
      title: 'React',
      description: 'Component design, hooks, state management',
      level: 'EXPERT',
    },
    status: MatchRequestStatus.ACCEPTED,
    message: 'UI/UX for React — a perfect match!',
  });
  await repo.matchRequests.save(u4u2Request);

  console.log('  Creating COMPLETED session (user4 ↔ user2)...');
  const sessionCompleted = repo.sessions.create({
    matchRequestId: u4u2Request.id,
    participant1Id: userRecords['user4@test.com'].id,
    participant2Id: userRecords['user2@test.com'].id,
    skill1Id: skillRecords['user4@test.com:UI/UX'].id,
    skill2Id: skillRecords['user2@test.com:React'].id,
    status: SessionStatus.COMPLETED,
    scheduledAt: PAST_DATE,
    duration: 120,
    format: SessionFormat.VIDEO,
    meetingLink: 'https://meet.google.com/old-completed-session',
    p1Completed: true,
    p2Completed: true,
    roadmap:
      '### For UI/UX:\n' +
      '- Week 1: Master design thinking and user research methods\n' +
      '- Week 2: Learn advanced prototyping in Figma\n' +
      '- Week 3: Study usability testing and accessibility\n' +
      '\n' +
      '### For React:\n' +
      '- Week 1: Deep dive into hooks and custom hooks\n' +
      '- Week 2: Learn state management with Zustand\n' +
      '- Week 3: Build a full-stack app with Next.js',
    suggestedResources: {
      'UI/UX': [
        {
          title: 'Designing Interfaces',
          url: 'https://www.designinginterfaces.com/',
          description: 'Patterns for effective interaction design',
        },
        {
          title: 'Nielsen Norman Group',
          url: 'https://www.nngroup.com/articles/',
          description: 'UX research and usability guidelines',
        },
      ],
      React: [
        {
          title: 'React Docs (Beta)',
          url: 'https://react.dev/',
          description: 'Official React documentation with examples',
        },
        {
          title: 'State Management with Zustand',
          url: 'https://docs.pmnd.rs/zustand/getting-started/introduction',
          description: 'Lightweight state management for React',
        },
      ],
    },
  });
  await repo.sessions.save(sessionCompleted);

  // Chat messages in the COMPLETED session
  const completedMessages = [
    {
      senderId: userRecords['user4@test.com'].id,
      content:
        'Great session! I learned a lot about React hooks and component composition.',
    },
    {
      senderId: userRecords['user2@test.com'].id,
      content:
        'Likewise! Your Figma prototyping tips were super helpful. Thanks!',
    },
  ];
  for (const m of completedMessages) {
    await repo.messages.save(
      repo.messages.create({
        sessionId: sessionCompleted.id,
        senderId: m.senderId,
        content: m.content,
      }),
    );
  }

  // Increment swappedCount for both skills in completed session
  await ds.query(
    `UPDATE skills SET "swappedCount" = "swappedCount" + 1 WHERE id IN ($1, $2)`,
    [
      skillRecords['user4@test.com:UI/UX'].id,
      skillRecords['user2@test.com:React'].id,
    ],
  );
  console.log('  Incremented swappedCount for completed skills.');

  // Reviews for the completed session
  await ds.query(
    `INSERT INTO reviews (id, "sessionId", "reviewerId", "revieweeId", rating, comment, "skillId", "createdAt", "updatedAt")
     VALUES (uuid_generate_v4(), $1, $2, $3, 5, 'Amazing teacher! Explained React hooks clearly with great examples.', $4, now(), now())`,
    [
      sessionCompleted.id,
      userRecords['user4@test.com'].id,
      userRecords['user2@test.com'].id,
      skillRecords['user2@test.com:React'].id,
    ],
  );
  await ds.query(
    `INSERT INTO reviews (id, "sessionId", "reviewerId", "revieweeId", rating, comment, "skillId", "createdAt", "updatedAt")
     VALUES (uuid_generate_v4(), $1, $2, $3, 4, 'Great UI/UX insights. Would have loved more time on design systems.', $4, now(), now())`,
    [
      sessionCompleted.id,
      userRecords['user2@test.com'].id,
      userRecords['user4@test.com'].id,
      skillRecords['user4@test.com:UI/UX'].id,
    ],
  );
  console.log('  Created 2 reviews for completed session.');

  // ──────────────────────────────────────────────
  // PENDING MATCH REQUEST  (user3 → user4)
  // Test: Accept/Decline flow on Matches page
  // ──────────────────────────────────────────────
  console.log('Creating pending match request: user3 -> user4...');
  const u3u4Request = repo.matchRequests.create({
    fromUserId: userRecords['user3@test.com'].id,
    toUserId: userRecords['user4@test.com'].id,
    offeredSkillId: skillRecords['user3@test.com:DevOps'].id,
    wantedSkillId: skillRecords['user3@test.com:UI/UX'].id,
    offeredSkillSnapshot: {
      title: 'DevOps',
      description: 'Docker, CI/CD pipelines, Kubernetes basics',
      level: 'INTERMEDIATE',
    },
    wantedSkillSnapshot: {
      title: 'UI/UX',
      description: 'User research, wireframing, prototyping',
      level: 'EXPERT',
    },
    status: MatchRequestStatus.PENDING,
    message: 'Hey! I can teach you DevOps if you help me with UI/UX design.',
  });
  await repo.matchRequests.save(u3u4Request);
  console.log('  Created pending match request.');

  // ──────────────────────────────────────────────
  // PORTFOLIOS for user1's skills
  // ──────────────────────────────────────────────
  console.log('Creating portfolios...');
  await ds.query(
    `INSERT INTO portfolios (id, title, url, type, "skillId", "createdAt", "updatedAt")
     VALUES (uuid_generate_v4(), 'E-Commerce Dashboard (React)', 'https://github.com/user1/react-dashboard', 'github', $1, now(), now())`,
    [skillRecords['user1@test.com:React'].id],
  );
  await ds.query(
    `INSERT INTO portfolios (id, title, url, type, "skillId", "createdAt", "updatedAt")
     VALUES (uuid_generate_v4(), 'TypeScript Utility Library', 'https://github.com/user1/ts-utils', 'github', $1, now(), now())`,
    [skillRecords['user1@test.com:TypeScript'].id],
  );
  console.log('  Created 2 portfolio entries.');

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  console.log('');
  console.log('Seed complete!');
  console.log('');
  console.log('Users:');
  console.log(
    '  user1@test.com / password123 — teaches: React, TypeScript      | wants: Python, DevOps',
  );
  console.log(
    '  user2@test.com / password123 — teaches: Python, ML            | wants: React, UI/UX',
  );
  console.log(
    '  user3@test.com / password123 — teaches: Node.js, DevOps       | wants: ML, TypeScript, UI/UX',
  );
  console.log(
    '  user4@test.com / password123 — teaches: UI/UX, Figma          | wants: Node.js, React',
  );
  console.log(
    '  user5@test.com / password123 — teaches: Java, Spring Boot     | wants: Python, DevOps',
  );
  console.log('');
  console.log('Session lifecycle scenarios:');
  console.log(
    '  1. NEGOTIATING — user1 ↔ user2 (React ↔ Python)           → test ScheduleCard + Start/Cancel',
  );
  console.log(
    '  2. SCHEDULED  — user3 ↔ user5 (DevOps ↔ Java)            → test Start Session + Mark Complete',
  );
  console.log(
    '  3. COMPLETED  — user4 ↔ user2 (UI/UX ↔ React) + reviews  → test review form, AI roadmap, resources',
  );
  console.log(
    '  4. PENDING    — user3 → user4 (DevOps → UI/UX)           → test Accept/Decline on Matches page',
  );
  console.log('');

  await ds.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
