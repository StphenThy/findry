/** `npm run inspect -w server` — print what is in the database (emails masked). Read-only. */
import { connectDB, disconnectDB } from '../db';
import { Application, EmployerProfile, Job, Message, SeekerProfile, User } from '../models';

const mask = (e: string) => e.replace(/^(.{2}).*(@.*)$/, '$1***$2');

(async () => {
  await connectDB();
  const users = await User.find().select('email roles createdAt').sort({ createdAt: 1 });
  console.log(`users: ${users.length}`);
  for (const u of users) console.log(`  ${mask(u.email).padEnd(28)} ${u.roles.join(',').padEnd(9)} ${u.createdAt.toISOString().slice(0, 10)}`);
  const jobs = await Job.find().select('title status createdAt');
  console.log(`jobs: ${jobs.length}`);
  for (const j of jobs) console.log(`  ${j.title} [${j.status}] ${j.createdAt.toISOString().slice(0, 10)}`);
  console.log(`seekers ${await SeekerProfile.countDocuments()}  employers ${await EmployerProfile.countDocuments()}  applications ${await Application.countDocuments()}  messages ${await Message.countDocuments()}`);
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
