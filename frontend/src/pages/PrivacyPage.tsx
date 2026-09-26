import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';

const UPDATED = 'September 26, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="text-3xl font-extrabold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <p>
          This policy explains what {APP_NAME} collects, why, and how it is handled. {APP_NAME} is a
          demonstration platform for traffic management simulation. It does not sell data, run ads or
          embed third-party analytics trackers.
        </p>

        <Section title="What we collect">
          <p>
            <strong className="text-slate-200">Account details.</strong> When you register, we store
            your name, email address, phone number and a bcrypt hash of your password. The password
            itself is never stored in readable form.
          </p>
          <p>
            <strong className="text-slate-200">Incident reports.</strong> If you report an incident,
            we store the description, incident type, severity, map coordinates, the location name you
            provide, an optional photo you upload, and your account reference as the reporter.
          </p>
          <p>
            <strong className="text-slate-200">Platform activity.</strong> Saved routes, notifications
            and administrative audit logs are stored to make the features work.
          </p>
          <p>
            <strong className="text-slate-200">Traffic data.</strong> Road conditions, vehicle counts,
            signal states and emergency events in the database are simulated sample data, not
            measurements of real people or vehicles.
          </p>
        </Section>

        <Section title="How your data is used">
          <p>Your account data is used only to sign you in, attribute incident reports and let you manage your own reports, routes and notifications. Incident reports are reviewed by operators before appearing publicly on the network map. Administrators can view and manage account records as part of operating the platform.</p>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            The app does not use advertising or tracking cookies. After you sign in, a JSON Web Token
            is kept in your browser's local storage so the API can authenticate your requests. Logging
            out removes it. Closing your browser does not remove it, so sign out on shared computers.
          </p>
        </Section>

        <Section title="Sharing">
          <p>
            Data is not shared with or sold to third parties. Everything is stored in the platform's
            own PostgreSQL database. Uploaded incident photos are served from the platform itself.
          </p>
        </Section>

        <Section title="Retention and deletion">
          <p>
            Account and report data are kept while your account exists. You can request deletion of
            your account and associated reports by contacting the site operator. Incident reports by
            other users may retain anonymized references after deletion.
          </p>
        </Section>

        <Section title="Security">
          <p>Passwords are hashed with bcrypt. API access uses short-lived JWT bearer tokens over HTTPS in production. Like any demonstration system, this platform is provided for educational use and should not be relied on as a production-grade service.</p>
        </Section>

        <Section title="Changes">
          <p>Updates to this policy will be posted on this page with a new "last updated" date.</p>
        </Section>

        <p className="border-t border-white/10 pt-6 text-slate-400">
          Questions about this policy can be sent to the site operator. See also our{' '}
          <Link to="/terms" className="text-sky-300 hover:text-sky-200">
            Terms and Conditions
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
