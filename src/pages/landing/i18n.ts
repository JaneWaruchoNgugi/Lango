export type LandingLang = 'en' | 'sw'

export interface Segment { title: string; blurb: string }
export interface Step { title: string; blurb: string }
export interface Feature { title: string; blurb: string }
export interface FaqItem { q: string; a: string }

export interface LandingCopy {
  nav: { signIn: string; bookDemo: string }
  hero: { badge: string; title: string; subtitle: string; ctaPrimary: string; ctaSecondary: string; trust: string }
  segmentsHeading: string
  segments: Segment[]
  howHeading: string
  steps: Step[]
  featuresHeading: string
  features: Feature[]
  whyHeading: string
  whyPoints: string[]
  pricingHeading: string
  pricingSub: string
  pricingCta: string
  perMonth: string
  faqHeading: string
  faqs: FaqItem[]
  form: {
    heading: string; sub: string
    name: string; propertyName: string; propertyType: string; phone: string; email: string; message: string
    submit: string; success: string; error: string
    or: string; whatsapp: string; call: string; emailUs: string
    typeOptions: string[]
  }
  footerTagline: string
}

const en: LandingCopy = {
  nav: { signIn: 'Sign In', bookDemo: 'Book a Demo' },
  hero: {
    badge: 'Visitor & Gate Management',
    title: 'Know exactly who is on your property.',
    subtitle: 'Lango replaces the paper gate book with instant WhatsApp alerts, digital visitor records and full incident tracking — tighter security and a smoother experience, for every kind of property.',
    ctaPrimary: 'Book a Free Demo',
    ctaSecondary: 'See pricing',
    trust: 'Built for Kenyan properties · Works on any phone',
  },
  segmentsHeading: 'One system for every property',
  segments: [
    { title: 'Residential', blurb: 'Apartments, gated estates and communities — welcome residents and their guests without the queue.' },
    { title: 'Commercial', blurb: 'Offices, malls and business parks — manage tenants, staff and daily deliveries with a clean audit trail.' },
    { title: 'Institutional', blurb: 'Schools, campuses and hospitals — control access, log every visitor and keep people accountable.' },
    { title: 'Industrial', blurb: 'Warehouses, factories and yards — track contractors, trucks and deliveries in and out, all shift long.' },
  ],
  howHeading: 'How it works',
  steps: [
    { title: 'Register the visitor', blurb: 'The guard captures the visitor and the unit they are visiting in seconds.' },
    { title: 'Resident gets an alert', blurb: 'An instant WhatsApp message lets the host approve or deny before entry.' },
    { title: 'Everything is recorded', blurb: 'Check-in, check-out, deliveries and incidents build a searchable digital record.' },
  ],
  featuresHeading: 'Everything you need at the gate',
  features: [
    { title: 'Visitor check-in / out', blurb: 'Fast registration with photo and ID, and a live view of who is currently inside.' },
    { title: 'Instant WhatsApp alerts', blurb: 'Residents and tenants are notified the moment a visitor or delivery arrives.' },
    { title: 'Delivery management', blurb: 'Log parcels and riders, notify recipients, and track collection.' },
    { title: 'Incident reporting', blurb: 'Guards report incidents with severity and photos; managers track to resolution.' },
    { title: 'Shift accountability', blurb: 'Every action is tied to a guard and a shift, so nothing is untraceable.' },
    { title: 'Live dashboard', blurb: 'Managers and owners see activity across one or many properties in real time.' },
  ],
  whyHeading: 'Security and experience, together',
  whyPoints: [
    'No more paper gate books — every entry is digital and searchable.',
    'Works on the phones your guards already carry.',
    'Role-based access for owners, managers, caretakers and guards.',
    'Manage a single block or a whole portfolio from one account.',
  ],
  pricingHeading: 'Simple, transparent pricing',
  pricingSub: 'Pick the plan that matches your property size. No hidden fees.',
  pricingCta: 'Book a Demo',
  perMonth: '/month',
  faqHeading: 'Frequently asked questions',
  faqs: [
    { q: 'How long does setup take?', a: 'Most properties are live within a day — we create your account, add your blocks and units, and train your guards.' },
    { q: 'Do we need special hardware?', a: 'No. Lango runs on any modern smartphone or tablet the guards already use.' },
    { q: 'Who owns the data?', a: 'You do. Your visitor and resident records belong to your property and are never sold.' },
    { q: 'Can it handle more than one property?', a: 'Yes. Owners and managers can oversee multiple properties from a single login.' },
  ],
  form: {
    heading: 'Book a free demo',
    sub: 'Tell us about your property and we will show you Lango in action.',
    name: 'Your name', propertyName: 'Property name', propertyType: 'Property type',
    phone: 'Phone number', email: 'Email (optional)', message: 'Anything else? (optional)',
    submit: 'Request Demo', success: 'Thanks! We will be in touch shortly.', error: 'Something went wrong. Please try WhatsApp instead.',
    or: 'or reach us directly', whatsapp: 'Chat on WhatsApp', call: 'Call us', emailUs: 'Email us',
    typeOptions: ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Other'],
  },
  footerTagline: 'Visitor & gate management for every property.',
}

const sw: LandingCopy = {
  nav: { signIn: 'Ingia', bookDemo: 'Omba Demo' },
  hero: {
    badge: 'Usimamizi wa Wageni na Lango',
    title: 'Jua hasa nani yuko kwenye mali yako.',
    subtitle: 'Lango inabadilisha daftari la lango kwa arifa za papo hapo za WhatsApp, rekodi za kidijitali za wageni na ufuatiliaji kamili wa matukio — usalama zaidi na urahisi, kwa kila aina ya mali.',
    ctaPrimary: 'Omba Demo Bila Malipo',
    ctaSecondary: 'Angalia bei',
    trust: 'Imejengwa kwa mali za Kenya · Inafanya kazi kwa simu yoyote',
  },
  segmentsHeading: 'Mfumo mmoja kwa kila mali',
  segments: [
    { title: 'Makazi', blurb: 'Apartments, mitaa iliyofungwa na jamii — karibisha wakazi na wageni wao bila foleni.' },
    { title: 'Biashara', blurb: 'Ofisi, maduka makubwa na mbuga za biashara — simamia wapangaji, wafanyakazi na vifurushi kwa rekodi safi.' },
    { title: 'Taasisi', blurb: 'Shule, vyuo na hospitali — dhibiti ufikiaji, andika kila mgeni na hakikisha uwajibikaji.' },
    { title: 'Viwanda', blurb: 'Maghala, viwanda na maeneo — fuatilia wakandarasi, malori na vifurushi vinavyoingia na kutoka.' },
  ],
  howHeading: 'Inavyofanya kazi',
  steps: [
    { title: 'Sajili mgeni', blurb: 'Mlinzi anaandika mgeni na nyumba anayotembelea kwa sekunde chache.' },
    { title: 'Mkazi anapata arifa', blurb: 'Ujumbe wa papo hapo wa WhatsApp humruhusu mwenyeji kukubali au kukataa kabla ya kuingia.' },
    { title: 'Kila kitu kinarekodiwa', blurb: 'Kuingia, kutoka, vifurushi na matukio hujenga rekodi ya kidijitali inayotafutika.' },
  ],
  featuresHeading: 'Kila kitu unachohitaji langoni',
  features: [
    { title: 'Kuingia / kutoka kwa wageni', blurb: 'Usajili wa haraka wenye picha na kitambulisho, na mwonekano wa nani yuko ndani sasa.' },
    { title: 'Arifa za papo hapo za WhatsApp', blurb: 'Wakazi na wapangaji hujulishwa mara mgeni au kifurushi kinapowasili.' },
    { title: 'Usimamizi wa vifurushi', blurb: 'Andika vifurushi na waendeshaji, arifu wapokeaji, na fuatilia ukusanyaji.' },
    { title: 'Kuripoti matukio', blurb: 'Walinzi huripoti matukio kwa uzito na picha; wasimamizi hufuatilia hadi utatuzi.' },
    { title: 'Uwajibikaji wa zamu', blurb: 'Kila hatua imeunganishwa na mlinzi na zamu, hakuna lisilofuatilika.' },
    { title: 'Dashibodi ya moja kwa moja', blurb: 'Wasimamizi na wamiliki huona shughuli za mali moja au nyingi papo hapo.' },
  ],
  whyHeading: 'Usalama na urahisi, pamoja',
  whyPoints: [
    'Hakuna tena daftari la karatasi — kila kuingia ni kidijitali na kunatafutika.',
    'Inafanya kazi kwa simu ambazo walinzi wako tayari wanazo.',
    'Ufikiaji kulingana na majukumu kwa wamiliki, wasimamizi, walinzi.',
    'Simamia block moja au mali nyingi kutoka akaunti moja.',
  ],
  pricingHeading: 'Bei rahisi na wazi',
  pricingSub: 'Chagua mpango unaolingana na ukubwa wa mali yako. Hakuna ada zilizofichwa.',
  pricingCta: 'Omba Demo',
  perMonth: '/mwezi',
  faqHeading: 'Maswali yanayoulizwa mara kwa mara',
  faqs: [
    { q: 'Usanidi huchukua muda gani?', a: 'Mali nyingi huanza kutumia ndani ya siku moja — tunaunda akaunti, tunaongeza block na nyumba, na kufundisha walinzi.' },
    { q: 'Tunahitaji vifaa maalum?', a: 'Hapana. Lango inafanya kazi kwa simu janja au tableti yoyote ya kisasa ambayo walinzi tayari wanatumia.' },
    { q: 'Nani anamiliki data?', a: 'Wewe. Rekodi za wageni na wakazi ni za mali yako na haziuzwi kamwe.' },
    { q: 'Inaweza kushughulikia mali zaidi ya moja?', a: 'Ndiyo. Wamiliki na wasimamizi wanaweza kusimamia mali nyingi kutoka kuingia kumoja.' },
  ],
  form: {
    heading: 'Omba demo bila malipo',
    sub: 'Tuambie kuhusu mali yako nasi tutakuonyesha Lango ikifanya kazi.',
    name: 'Jina lako', propertyName: 'Jina la mali', propertyType: 'Aina ya mali',
    phone: 'Namba ya simu', email: 'Barua pepe (si lazima)', message: 'Kitu kingine? (si lazima)',
    submit: 'Omba Demo', success: 'Asante! Tutawasiliana nawe hivi karibuni.', error: 'Kuna hitilafu. Tafadhali jaribu WhatsApp.',
    or: 'au wasiliana nasi moja kwa moja', whatsapp: 'Piga soga WhatsApp', call: 'Tupigie simu', emailUs: 'Tutumie barua pepe',
    typeOptions: ['Makazi', 'Biashara', 'Taasisi', 'Viwanda', 'Nyingine'],
  },
  footerTagline: 'Usimamizi wa wageni na lango kwa kila mali.',
}

export const STRINGS: Record<LandingLang, LandingCopy> = { en, sw }
