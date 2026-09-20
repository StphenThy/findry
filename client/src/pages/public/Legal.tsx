import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/ui';

function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-margin-sm md:px-margin h-16 flex items-center justify-between">
        <Logo />
        <Link to="/" className="caption text-primary font-semibold hover:underline">
          Back to home
        </Link>
      </div>
      <main className="flex-1 max-w-3xl mx-auto w-full px-margin-sm md:px-margin py-space-xl">
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">{title}</h1>
        <p className="caption mt-1 mb-space-lg">Last updated {updated}</p>
        <div className="flex flex-col gap-space-md font-body-md text-body-md text-on-surface-variant [&_h2]:font-title-card [&_h2]:text-title-card [&_h2]:text-on-surface [&_h2]:mt-space-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">{children}</div>
      </main>
    </div>
  );
}

/** Plain-language description of what Findry actually stores and does with it. Review with counsel before launch. */
export function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy" updated="September 2026">
      <p>Findry is a job-matching platform for the Philippine tech market. This policy explains what personal data we collect, why, and the rights you have under the Data Privacy Act of 2012 (RA 10173).</p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> name, email address and a hashed password. We never store your password in plain text.
        </li>
        <li>
          <strong>Job seekers:</strong> the resume you upload (we keep the extracted text, not the file), plus the skills, experience, education, salary expectations, location and links you confirm on your profile.
        </li>
        <li>
          <strong>Employers:</strong> company name, industry, size, location, website and description, and the jobs you post.
        </li>
        <li>
          <strong>Activity:</strong> applications, application status changes, messages between a seeker and an employer, saved jobs and job views.
        </li>
        <li>
          <strong>Technical:</strong> IP address and request logs used only for security (rate limiting, abuse prevention).
        </li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To compute your match score against jobs and show employers ranked candidates who applied to their roles.</li>
        <li>To let seekers and employers message each other about an application.</li>
        <li>Resume text may be sent to an AI provider (Google Gemini) solely to extract skills and experience. It is not used to train public models and is not sold.</li>
        <li>To send password-reset emails when you request them.</li>
      </ul>
      <h2>Who can see your data</h2>
      <ul>
        <li>Employers see your profile only after you apply to one of their jobs. Ghost mode lets you hide from specific companies entirely.</li>
        <li>Seekers see public company information and the jobs an employer publishes. Draft jobs are private.</li>
        <li>We do not sell personal data to anyone.</li>
      </ul>
      <h2>Retention and your rights</h2>
      <ul>
        <li>Data is kept while your account is active. Email us to access, correct or delete your account and all associated data, and we will action it within 15 working days.</li>
        <li>You may withdraw an application at any time; the employer can no longer change its status afterwards.</li>
      </ul>
      <h2>Contact</h2>
      <p>Questions or data-privacy requests: use the contact email published on the site footer. If you believe your rights under RA 10173 have been violated you may also contact the National Privacy Commission.</p>
    </LegalShell>
  );
}

export function TermsOfService() {
  return (
    <LegalShell title="Terms of Service" updated="September 2026">
      <p>By creating a Findry account you agree to these terms. If you do not agree, please do not use the service.</p>
      <h2>Accounts</h2>
      <ul>
        <li>One email address is one account with one role (Job Seeker or Employer). You are responsible for keeping your password confidential.</li>
        <li>You must provide accurate information. Employers must have authority to recruit on behalf of the company they register.</li>
      </ul>
      <h2>Acceptable use</h2>
      <ul>
        <li>No fake job postings, no scraping of candidate or company data, no harassment or spam through messaging.</li>
        <li>Match scores are computed from the information both sides provide and are guidance only; hiring decisions remain the employer's responsibility.</li>
      </ul>
      <h2>Content</h2>
      <p>You keep ownership of what you upload. You grant Findry a licence to process it for the purpose of matching and displaying it to the other party in an application, as described in the Privacy Policy.</p>
      <h2>Availability and liability</h2>
      <p>Findry is provided "as is". We aim for high availability but do not guarantee uninterrupted service, and we are not liable for hiring outcomes, lost opportunities or indirect damages arising from use of the platform.</p>
      <h2>Termination</h2>
      <p>
        We may suspend accounts that break these terms. You can request deletion of your account at any time via the contact in our{' '}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </LegalShell>
  );
}
