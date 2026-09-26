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

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      <h1 className="text-3xl font-extrabold text-white">Terms and Conditions</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <p>
          By using {APP_NAME}, you agree to these terms. If you do not agree, please stop using the
          platform.
        </p>

        <Section title="What this platform is">
          <p>
            {APP_NAME} is an educational simulation of an intelligent traffic management and
            emergency vehicle prioritization system. Road conditions, vehicle movements, detections,
            signal states and emergency events are simulated sample data. The platform is not
            connected to real traffic infrastructure and does not provide real-time traffic
            information.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Submit incident reports that are truthful and about real road conditions you observed.</li>
            <li>Not upload images that are unlawful, unrelated to the reported incident, or that contain personal information about others.</li>
            <li>Not attempt to access accounts, data or administrative functions that are not yours.</li>
            <li>Not disrupt, overload or reverse-engineer the service in ways that degrade it for others.</li>
          </ul>
        </Section>

        <Section title="Accounts">
          <p>
            You are responsible for the accuracy of your registration details and for keeping your
            password safe. Accounts may be suspended or removed for misuse, at the operator's
            discretion. You can stop using the platform at any time and request account deletion
            through the Privacy Policy page.
          </p>
        </Section>

        <Section title="Content you submit">
          <p>
            You keep ownership of the incident reports and images you submit. By submitting, you give
            the platform permission to display them to other users and to operators reviewing
            reports. Reports may be edited, marked with status notes or removed by operators.
          </p>
        </Section>

        <Section title="No warranty">
          <p>
            The platform is provided "as is" for demonstration and education, without warranties of
            any kind. Do not rely on it for navigation, routing decisions, emergency response or any
            safety-critical purpose. In an emergency, contact your local emergency services.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, the operators of {APP_NAME} are not liable for
            any loss or damage arising from your use of, or inability to use, the platform,
            including decisions made based on simulated data presented on it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            These terms may be updated as the platform evolves. Continued use after changes are
            posted on this page constitutes acceptance of the revised terms.
          </p>
        </Section>

        <p className="border-t border-white/10 pt-6 text-slate-400">
          See also our{' '}
          <Link to="/privacy" className="text-sky-300 hover:text-sky-200">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
