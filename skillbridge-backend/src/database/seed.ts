import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User } from '../modules/user/user.entity';
import { Skill, SkillType, ProficiencyLevel } from '../modules/skill/skill.entity';
import { MatchRequest, MatchRequestStatus } from '../modules/match/match-request.entity';
import { Session, SessionStatus, SessionFormat } from '../modules/session/session.entity';
import { Message } from '../modules/message/message.entity';
import { hash } from 'bcryptjs';

const USERS = [
  { email: 'alice@test.com', name: 'Alice Chen', teaches: ['React', 'TypeScript'], wants: ['Python', 'DevOps'] },
  { email: 'bob@test.com', name: 'Bob Smith', teaches: ['Python', 'Machine Learning'], wants: ['React', 'UI/UX'] },
  { email: 'charlie@test.com', name: 'Charlie Dev', teaches: ['Node.js', 'DevOps'], wants: ['Machine Learning', 'TypeScript', 'UI/UX'] },
  { email: 'diana@test.com', name: 'Diana Park', teaches: ['UI/UX', 'Figma'], wants: ['Node.js', 'React'] },
  { email: 'evan@test.com', name: 'Evan Lee', teaches: ['Java', 'Spring Boot'], wants: ['Python', 'DevOps'] },
];

const SKILL_META: Record<string, { category: string; level: ProficiencyLevel; description: string }> = {
  React: { category: 'Frontend', level: ProficiencyLevel.EXPERT, description: 'Component design, hooks, state management with Redux/Zustand' },
  TypeScript: { category: 'Languages', level: ProficiencyLevel.EXPERT, description: 'Advanced generics, utility types, strict mode patterns' },
  Python: { category: 'Languages', level: ProficiencyLevel.EXPERT, description: 'Scripting, data analysis, Flask/FastAPI, async programming' },
  'DevOps': { category: 'Infrastructure', level: ProficiencyLevel.INTERMEDIATE, description: 'Docker, CI/CD pipelines, Kubernetes basics, AWS/GCP' },
  'Machine Learning': { category: 'Data Science', level: ProficiencyLevel.EXPERT, description: 'Scikit-learn, TensorFlow, model training & evaluation' },
  'UI/UX': { category: 'Design', level: ProficiencyLevel.EXPERT, description: 'User research, wireframing, prototyping, usability testing' },
  Figma: { category: 'Design', level: ProficiencyLevel.EXPERT, description: 'Auto layout, components, design systems, prototyping' },
  'Node.js': { category: 'Backend', level: ProficiencyLevel.EXPERT, description: 'Express/NestJS, REST APIs, authentication, microservices' },
  Java: { category: 'Languages', level: ProficiencyLevel.EXPERT, description: 'OOP, concurrency, Spring ecosystem, design patterns' },
  'Spring Boot': { category: 'Backend', level: ProficiencyLevel.EXPERT, description: 'REST APIs, JPA/Hibernate, security, actuator' },
};

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

  // Match request 1: Alice -> Bob (React <-> Python)
  console.log('Creating match request: Alice -> Bob...');
  const aliceBobRequest = repo.matchRequests.create({
    fromUserId: userRecords['alice@test.com'].id,
    toUserId: userRecords['bob@test.com'].id,
    offeredSkillId: skillRecords['alice@test.com:React'].id,
    wantedSkillId: skillRecords['alice@test.com:Python'].id,
    offeredSkillSnapshot: { title: 'React', description: 'Component design, hooks, state management', level: 'EXPERT' },
    wantedSkillSnapshot: { title: 'Python', description: 'Scripting, data analysis, Flask/FastAPI', level: 'EXPERT' },
    status: MatchRequestStatus.ACCEPTED,
    message: 'Hey Bob! I see you want to learn React. I can help with that if you teach me Python!',
  });
  await repo.matchRequests.save(aliceBobRequest);

  // Session 1: Alice <-> Bob (NEGOTIATING)
  console.log('Creating session: Alice <-> Bob...');
  const session = repo.sessions.create({
    matchRequestId: aliceBobRequest.id,
    participant1Id: userRecords['alice@test.com'].id,
    participant2Id: userRecords['bob@test.com'].id,
    skill1Id: skillRecords['alice@test.com:React'].id,
    skill2Id: skillRecords['bob@test.com:Python'].id,
    status: SessionStatus.NEGOTIATING,
    duration: 60,
    format: SessionFormat.VIDEO,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
  });
  await repo.sessions.save(session);

  // Chat messages in the session
  console.log('Creating messages...');
  const messages = [
    { senderId: userRecords['alice@test.com'].id, content: 'Hi Bob! Excited to learn Python with you. When are you free?' },
    { senderId: userRecords['bob@test.com'].id, content: 'Hey Alice! I\'m available weekdays after 6pm UTC. Does that work?' },
    { senderId: userRecords['alice@test.com'].id, content: 'Perfect! Let\'s start with React fundamentals and I\'ll get Python basics from you.' },
    { senderId: userRecords['bob@test.com'].id, content: 'Sounds like a plan. I\'ve set up a meeting link for our first session.' },
  ];
  for (const m of messages) {
    await repo.messages.save(
      repo.messages.create({
        sessionId: session.id,
        senderId: m.senderId,
        content: m.content,
      }),
    );
  }
  console.log(`  Created ${messages.length} messages.`);

  // Match request 2: Charlie -> Diana (Node.js <-> UI/UX)
  console.log('Creating match request: Charlie -> Diana...');
  const charlieDianaRequest = repo.matchRequests.create({
    fromUserId: userRecords['charlie@test.com'].id,
    toUserId: userRecords['diana@test.com'].id,
    offeredSkillId: skillRecords['charlie@test.com:Node.js'].id,
    wantedSkillId: skillRecords['charlie@test.com:UI/UX'].id,
    offeredSkillSnapshot: { title: 'Node.js', description: 'Express/NestJS, REST APIs, authentication', level: 'EXPERT' },
    wantedSkillSnapshot: { title: 'UI/UX', description: 'User research, wireframing, prototyping', level: 'EXPERT' },
    status: MatchRequestStatus.PENDING,
    message: 'Hey Diana! I\'d love to trade Node.js knowledge for UI/UX design tips.',
  });
  await repo.matchRequests.save(charlieDianaRequest);

  console.log('Seed complete!');
  console.log('');
  console.log('Users:');
  console.log('  alice@test.com / password123 — teaches: React, TypeScript | wants: Python, DevOps');
  console.log('  bob@test.com / password123    — teaches: Python, ML       | wants: React, UI/UX');
  console.log('  charlie@test.com / password123— teaches: Node.js, DevOps   | wants: ML, TypeScript');
  console.log('  diana@test.com / password123  — teaches: UI/UX, Figma      | wants: Node.js, React');
  console.log('  evan@test.com / password123   — teaches: Java, Spring Boot | wants: Python, DevOps');
  console.log('');
  console.log('Active session: Alice <-> Bob (NEGOTIATING) with 4 chat messages');
  console.log('Pending request: Charlie -> Diana');

  await ds.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
