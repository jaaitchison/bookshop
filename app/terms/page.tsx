import { LegalPage } from "@/src/components/legal/LegalPage";

export default function TermsPage() {
  return <LegalPage title="Terms of service" summary="The rules for using Book Shop as a Reader, Writer or Administrator. Last updated 6 August 2026.">
    <section><h2>Using Book Shop</h2><p>You must provide accurate account information, keep your sign-in details secure and use the service lawfully. You remain responsible for activity performed through your account. Access may be restricted where necessary to protect readers, writers, the platform or the law.</p></section>
    <section><h2>Reader purchases</h2><p>Prices are shown in pounds sterling and are recalculated by the server at checkout. Payment is handled by Stripe. A completed purchase grants a personal, non-transferable right to access the purchased digital book through your library, subject to the author&apos;s rights and these terms.</p></section>
    <section><h2>Writer content</h2><p>Writers retain ownership of their work and confirm they have the rights needed to upload, submit and sell it. Writers grant Book Shop the limited rights needed to store, review, display, deliver and promote submitted books. Unlawful, infringing or harmful material may be rejected or removed.</p></section>
    <section><h2>Moderation and availability</h2><p>Publication requires Admin review. Approval is not guaranteed. We may request changes, archive submissions, maintain the service, correct errors or suspend access when reasonably necessary.</p></section>
    <section><h2>Legal rights</h2><p>Nothing in these terms excludes rights that cannot lawfully be excluded, including applicable UK consumer rights. These terms are intended to be governed by the laws of England and Wales, subject to any mandatory protections that apply where you live.</p></section>
  </LegalPage>;
}
