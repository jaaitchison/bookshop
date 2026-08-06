import Link from "next/link";
import { LegalPage } from "@/src/components/legal/LegalPage";

export default function PrivacyPage() {
  return <LegalPage title="Privacy notice" summary="How Book Shop uses account, publishing, purchase and reading information. Last updated 6 August 2026.">
    <section><h2>Information we use</h2><p>We process account details, assigned roles, Writer profiles, uploaded works, cart and order records, library entitlements, reviews, reading progress, security logs and messages connected with the service. Stripe handles card details; Book Shop stores payment identifiers and fulfilment records, not full card numbers.</p></section>
    <section><h2>Why we use it</h2><ul><li>To create accounts and perform contracts for purchases and publishing services.</li><li>To protect accounts, prevent abuse and meet legal obligations.</li><li>To operate catalogues, moderation, libraries, customer support and transactional communications.</li><li>To improve the service where our legitimate interests do not override your rights.</li></ul></section>
    <section><h2>Sharing and international transfers</h2><p>Information may be shared with hosting, PostgreSQL, object-storage, payment and transactional-email providers only where needed to run the service. The operator must document each provider, location and applicable transfer safeguard before launch.</p></section>
    <section><h2>Retention and your rights</h2><p>Records should be kept only as long as required for the purpose, contractual records, fraud prevention and legal obligations. Depending on the circumstances, you may request access, correction, deletion, restriction, portability or objection, and may withdraw consent where consent is the basis.</p></section>
    <section><h2>Questions and complaints</h2><p>Contact details for the data controller must be added before launch. You may also complain to the <Link href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer">Information Commissioner&apos;s Office</Link>.</p></section>
  </LegalPage>;
}
