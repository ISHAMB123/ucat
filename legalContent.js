/* ================================================================== */
/*  LEGAL CONTENT                                                      */
/*                                                                     */
/*  Copy supplied by the operator (see tempo legal pack). A UK         */
/*  solicitor should review these before the first payment is taken.   */
/*                                                                     */
/*  BEFORE LAUNCH: fill in LEGAL_CONFIG below. The controller name and */
/*  contact email are legally required in the privacy policy, and the  */
/*  last-updated date should be set whenever the policies change.      */
/* ================================================================== */

export const LEGAL_CONFIG = {
  /* If trading as an individual, this must be your personal name. */
  controller: "Isham Bari",
  contactEmail: "ishambari6@gmail.com",
  lastUpdated: "22 July 2026",
};

/* True while any placeholder is still unset, so the UI can warn the
   operator (and only the operator would ever see live placeholders). */
export const legalPlaceholdersPending = () =>
  Object.values(LEGAL_CONFIG).some((v) => v.includes("["));

/* Replace {controller}, {email} and {updated} tokens at render time. */
export function fillLegal(text) {
  return text
    .replace(/\{controller\}/g, LEGAL_CONFIG.controller)
    .replace(/\{email\}/g, LEGAL_CONFIG.contactEmail)
    .replace(/\{updated\}/g, LEGAL_CONFIG.lastUpdated);
}

export const PRIVACY = {
  title: "Privacy",
  sections: [
    { h: "Who we are", p: "Tempo is run by {controller}, contactable at {email} for anything to do with your data." },
    { h: "What we store", p: "Your drill results, mistakes, timings, settings, exam date, and anything you write in the interview or personal statement tools. If you create an account we also store your email address so your progress follows you between devices. If you use Tempo without an account, everything stays in your browser and never reaches us." },
    { h: "Why we store it", p: "To make the app work: to show your progress, to bring back questions you got wrong, and to keep your drafts. If you have an account, our legal basis is performing the contract you entered when you signed up. For the optional item below, the basis is your consent." },
    { h: "What you write stays yours", p: "Personal statements, interview answers and anything else you type are yours. We do not read them. Marking runs entirely on your own device using fixed rules, so your writing is never transmitted to us or to anyone else. We will never use your writing for marketing or to train any system unless you separately opt in, which is off by default and can be withdrawn at any time." },
    { h: "Who we share with", p: "Payments are handled entirely by Stripe, who process your card details under their own privacy policy. We never see or store a card number. Account data is stored with Supabase, who host it on our behalf and process it only on our instructions. We do not sell your data, share it with advertisers, or pass it to anyone else." },
    { h: "Cookies and analytics", p: "We use no tracking cookies, no advertising, and no third-party analytics. The app stores your progress on your own device using your browser's storage. That is why you will not see a cookie banner here." },
    { h: "How long we keep it", p: "For as long as you have an account, or until you delete it. Accounts inactive for 24 months are deleted automatically. Without an account, nothing is kept by us at all." },
    { h: "Your rights", p: "You can download everything we hold about you, correct it, or delete your account and all its data, all from your account page. You can also email {email} and we will action any request within 30 days. If you are unhappy with how we have handled your data you can complain to the Information Commissioner's Office at ico.org.uk." },
    { h: "Security", p: "The site runs over HTTPS. Passwords are hashed by Supabase and never stored by us in readable form. Card details never touch our systems." },
    { h: "Age", p: "Tempo is intended for users aged 16 and over. If you are under 18, please make sure a parent or guardian knows you are using it and has agreed to any payment." },
    { h: "Changes", p: "If we change this policy we will say so in the app and update the date below." },
    { h: "", p: "Last updated: {updated}" },
  ],
};

export const TERMS = {
  title: "Terms",
  sections: [
    { h: "What Tempo is", p: "A preparation tool for the UCAT and for medicine and dentistry applications. You buy one-off access for £25. There is no subscription and no renewal." },
    { h: "What you get", p: "Everything described on the access page at the time you buy, including anything added to that season afterwards. Access does not expire." },
    { h: "Your work is yours", p: "You keep full ownership and copyright of everything you write here. Using the marking tools gives us permission to process your text on your device to generate feedback, and nothing beyond that. We will never publish, share or quote your work without asking you first and receiving a clear yes." },
    { h: "What we do not promise", p: "Tempo is designed to improve your preparation. It does not guarantee any UCAT score, any interview, or any offer. Admissions decisions are made by universities using their own criteria, which they control and change. Nothing in this app is official admissions guidance and it must not be treated as such." },
    { h: "Information in the app", p: "Entry requirements, cut-off scores, fees, interview formats and living costs shown here are researched estimates that go out of date. Always confirm them on the university's own pages before making any application decision. We are not responsible for decisions made on the basis of figures that have since changed." },
    { h: "Feedback is automated", p: "Marking and suggestions are generated by fixed rules, not by a human and not by artificial intelligence. They read patterns, not meaning, and they can be wrong. Have someone qualified read your work before you submit it anywhere that matters." },
    { h: "Original content", p: "All questions, passages and scenarios in Tempo are our own work. They are not reproduced from the UCAT Consortium or from any other preparation provider. You may use them for your own study, but you may not copy, republish or resell them." },
    { h: "Refunds", p: "If Tempo does not work as described, email {email} and we will refund you in full. We would rather give your money back than have you use something that is not helping." },
    { h: "Accounts", p: "Keep your password to yourself. Tell us if you think someone else has access to your account." },
    { h: "Ending access", p: "We may withdraw access if someone is redistributing our content or attempting to break the service. We will explain why and refund any unused value where it is fair to do so." },
    { h: "Law", p: "These terms are governed by the law of England and Wales." },
    { h: "", p: "Last updated: {updated}" },
  ],
};

export const DISCLAIMER = {
  title: "Disclaimer",
  paragraphs: [
    "Tempo is an independent study tool. We are not affiliated with, endorsed by or connected to the UCAT Consortium, UCAS, or any university. UCAT is a trademark of its owner and is used here only to describe what this app prepares you for. All questions and passages are our own original work.",
    "Nothing here is official admissions guidance, medical advice, or legal or financial advice. Entry requirements and fees change every year: confirm everything on the university's own pages before you apply.",
  ],
};

/* Short disclaimer for footers and the top of the interview and
   university sections. */
export const DISCLAIMER_SHORT =
  "Independent study tool, not affiliated with the UCAT Consortium, UCAS or any university. All content is original. Nothing here is official admissions, medical, legal or financial advice.";

/* Automated-marking disclosure. Shown wherever writing is marked. The
   marking is fixed rules, not AI, and nothing leaves the device. */
export const MARKING_DISCLOSURE =
  "Feedback here is generated by fixed rules, not artificial intelligence. It counts patterns in your writing such as specific detail, first-person actions and reflective language. It does not understand meaning, it can be wrong, and it deliberately ignores spelling and grammar. Nothing you write is sent anywhere: the marking runs entirely on your own device. Always have a teacher, tutor or someone qualified read your work before you submit it.";

export const MARKING_DISCLOSURE_SHORT =
  "Marked on your device by fixed rules, not AI. It reads patterns, not meaning, and can be wrong. Nothing you write leaves your device.";

/* Storage notice for the signup screen and privacy tab. */
export const STORAGE_NOTICE =
  "No tracking cookies and no analytics. Your progress is saved in your own browser, and with an account it also syncs through Supabase so it follows you between devices.";

/* Consent labels used at signup. The optional one starts unticked. */
export const CONSENT = {
  terms: "I agree to the Terms and the Privacy Policy.",
  improve: "Optional: Tempo may use anonymised excerpts of my writing to help improve its marking. This is off unless you tick it, and you can change it any time from the Legal page.",
};
