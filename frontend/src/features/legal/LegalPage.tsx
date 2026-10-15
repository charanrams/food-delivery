import { useEffect } from 'react';
import { Link } from 'react-router';

// DRAFT legal copy — have it reviewed before launch. Mobile opens these same URLs via url_launcher.
export const LEGAL_UPDATED = '14 October 2026';
const CONTACT_EMAIL = 'support@a3kitchen.in';

type Section = { heading: string; body: string[] };

const TERMS: Section[] = [
  { heading: 'About these terms', body: ['These terms apply when you browse, order or deliver through the A3 Kitchen website and apps. By creating an account or placing an order you agree to them. If you don’t agree, please don’t use the service.'] },
  { heading: 'Your account', body: ['You must give accurate details, including a mobile number we can reach you on during delivery. Keep your password and one-time codes private — you are responsible for orders placed from your account.', 'We may suspend accounts that misuse the service, place fraudulent orders or abuse our staff or delivery partners.'] },
  { heading: 'Orders and prices', body: ['Menu prices include the dish price shown; delivery fees and GST are shown at checkout before you pay. The price on your order confirmation is final.', 'An order is confirmed only when the kitchen accepts it. We may decline an order if an item is unavailable, the kitchen is closed or your address is outside our delivery area — you won’t be charged for a declined order.'] },
  { heading: 'Payment', body: ['You can pay online or by cash on delivery where offered. Online payments are processed by our payment partner; A3 Kitchen never sees or stores your full card details.'] },
  { heading: 'Delivery', body: ['Delivery times are estimates. To hand over your order the delivery partner may ask for the delivery code shown in your app — please only share it when you have your food.', 'If no one is available to receive the order after reasonable attempts to contact you, it may be marked as undeliverable and may not be refunded.'] },
  { heading: 'Cancellations and refunds', body: ['You can cancel until the kitchen starts preparing your order. If something is missing, wrong or spoiled, contact us within 24 hours with your order number and a photo. Approved refunds go back to the original payment method.'] },
  { heading: 'Allergies and food safety', body: ['Our kitchen handles nuts, dairy, gluten and other allergens. Veg markers describe ingredients, not allergen-free preparation. If you have an allergy, contact us before ordering.'] },
  { heading: 'Liability', body: ['We take care to prepare and deliver food safely. To the extent the law allows, our liability for any order is limited to the amount you paid for it. Nothing here limits rights you have under Indian consumer protection law.'] },
  { heading: 'Changes', body: ['We may update these terms. The date at the top shows the latest version; continuing to use the service means you accept the update.'] },
  { heading: 'Contact', body: [`Questions about these terms: ${CONTACT_EMAIL}. These terms are governed by the laws of India.`] },
];

const PRIVACY: Section[] = [
  { heading: 'What we collect', body: ['Account details: your name, mobile number, email and password (stored only as a secure hash).', 'Order details: items, delivery addresses, delivery instructions, payment status and order history.', 'Device and usage data: basic logs such as IP address, browser or app version and error reports, used to keep the service secure and working.'] },
  { heading: 'How we use it', body: ['To create your account, verify your email or phone with one-time codes, take and deliver your orders, process payments and refunds, send order updates and handle support requests. We don’t sell your personal data.'] },
  { heading: 'Who we share it with', body: ['Delivery partners see your name, phone number and delivery address only for orders assigned to them.', 'Service providers who help us run A3 Kitchen — payment processing, email delivery, hosting and image storage — process data on our behalf under contract.', 'Authorities, when the law requires it.'] },
  { heading: 'How long we keep it', body: ['We keep your account data while your account is active. Order and payment records are kept as long as tax and accounting laws require. One-time codes expire within minutes and are deleted automatically.'] },
  { heading: 'Security', body: ['Passwords and one-time codes are stored hashed, connections are encrypted, and staff access is limited by role. No system is perfectly secure — tell us immediately if you suspect misuse of your account.'] },
  { heading: 'Your choices and rights', body: ['You can view and update your profile in the app, and ask us for a copy of your data, a correction, or to delete your account. We’ll respond within 30 days, subject to records we must keep by law.'] },
  { heading: 'Cookies', body: ['The website uses one essential cookie to keep you signed in securely. We don’t use advertising cookies.'] },
  { heading: 'Children', body: ['A3 Kitchen is not intended for children under 18. Accounts should be created by an adult.'] },
  { heading: 'Changes and contact', body: [`We’ll update the date above when this policy changes. Privacy questions or requests: ${CONTACT_EMAIL}.`] },
];

const PAGES = {
  terms: { title: 'Terms & Conditions', intro: 'The rules for ordering from and delivering for A3 Kitchen.', sections: TERMS },
  privacy: { title: 'Privacy Policy', intro: 'What personal data A3 Kitchen collects, why, and the choices you have.', sections: PRIVACY },
};

/** Terms & Conditions and Privacy Policy — public pages, also opened from the mobile apps. */
export function LegalPage({ kind }: { kind: keyof typeof PAGES }) {
  const page = PAGES[kind];
  useEffect(() => {
    document.title = `${page.title} · A3 Kitchen`;
    window.scrollTo(0, 0);
  }, [page.title]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-display text-4xl">{page.title}</h1>
      <p className="mt-2 text-muted">{page.intro}</p>
      <p className="mt-1 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>

      <nav aria-label="On this page" className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {page.sections.map((s, i) => (
            <li key={s.heading}>
              <a href={`#s${i}`} className="text-primary-strong underline-offset-2 hover:underline">{s.heading}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 flex flex-col gap-9">
        {page.sections.map((s, i) => (
          <section key={s.heading} id={`s${i}`} className="scroll-mt-24">
            <h2 className="font-display text-2xl">{s.heading}</h2>
            {s.body.map((para) => (
              <p key={para} className="mt-3 max-w-[68ch] leading-relaxed">{para}</p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
        See also:{' '}
        <Link to={kind === 'terms' ? '/privacy' : '/terms'} className="font-medium text-primary-strong">
          {kind === 'terms' ? 'Privacy Policy' : 'Terms & Conditions'}
        </Link>
      </p>
    </article>
  );
}
