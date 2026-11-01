import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Lang = 'en' | 'hi'

/**
 * Only the strings a first-time user touches are translated: the sign-in path and the patient
 * workspace. Clinical text, records and prescriptions stay in the source language they were
 * written in, because a machine-translated dose instruction is a safety problem.
 */
export const translations = {
  en: {
    welcome: "GramHealth",
    tagline: "Primary care that keeps working when the signal drops.",
    selectRole: "Choose a workspace",
    patient: "Patient",
    doctor: "Doctor",
    admin: "District admin",
    seller: "Pharmacy",
    login: "Sign in",
    mobileNumber: "Mobile number",
    otp: "Verification code",
    sendOtp: "Send code",
    verify: "Verify and enter",
    symptoms: "Describe how you feel, in a sentence or two.",
    bookAppointment: "Book an appointment",
    viewRecords: "Health records",
    emergencyServices: "Emergency",
    governmentSchemes: "Government schemes",
    medicineAvailability: "Medicine availability",
    aiSymptomChecker: "Symptom guidance",
    language: "Language",
  },
  hi: {
    welcome: "ग्राम स्वास्थ्य",
    tagline: "सिग्नल जाए, सेवा न रुके।",
    selectRole: "अपना वर्कस्पेस चुनें",
    patient: "मरीज़",
    doctor: "डॉक्टर",
    admin: "जिला प्रशासक",
    seller: "दवाखाना",
    login: "लॉग इन",
    mobileNumber: "मोबाइल नंबर",
    otp: "सत्यापन कोड",
    sendOtp: "कोड भेजें",
    verify: "सत्यापित करें",
    symptoms: "दो पंक्तियों में बताइए कि आपको कैसा लग रहा है।",
    bookAppointment: "अपॉइंटमेंट बुक करें",
    viewRecords: "स्वास्थ्य रिकॉर्ड",
    emergencyServices: "आपातकाल",
    governmentSchemes: "सरकारी योजनाएं",
    medicineAvailability: "दवा की उपलब्धता",
    aiSymptomChecker: "लक्षण मार्गदर्शन",
    language: "भाषा",
  },
};

export interface SymptomGuidance {
  readout: string;
  severity: string;
  nextSteps: string[];
  selfCare: string[];
  priority: 'High' | 'Medium' | 'Low';
}

/**
 * Keyword guidance, not a model. It never names a diagnosis and never suggests a dose beyond
 * what the patient already has on hand. The label on the screen has to say the same thing.
 */
const guidance = (
  readout: string,
  severity: string,
  priority: SymptomGuidance['priority'],
  nextSteps: string[],
  selfCare: string[],
): SymptomGuidance => ({ readout, severity, priority, nextSteps, selfCare });

export const analyzeSymptoms = (symptoms: string): SymptomGuidance => {
  const text = symptoms.toLowerCase();

  if (/(chest pain|सीने में दर्द|breathless|सांस)/.test(text)) {
    return guidance(
      'Chest pain or breathlessness',
      'Needs a clinician now',
      'High',
      ['Call 112 or 108 before doing anything else', 'Do not walk to the clinic alone', 'Sit upright and keep the phone in reach', 'Tell someone nearby what you feel'],
      ['Loosen tight clothing', 'Breathe slowly, do not lie flat', 'Nothing to eat or drink until help arrives'],
    );
  }

  if (/(fever|बुखार|temperature)/.test(text)) {
    return guidance(
      'Fever',
      'Usually self-limiting',
      'Medium',
      ['Book a consult if it crosses three days', 'Note the temperature and time twice a day', 'Watch for breathlessness, rash, or reduced urine', 'Any fever with stiffness of the neck needs same-day care'],
      ['Plenty of fluids, small and frequent', 'Tepid sponging if the skin feels burning', 'Light food, no force-feeding'],
    );
  }

  if (/(cough|खांसी|throat|गला)/.test(text)) {
    return guidance(
      'Cough or sore throat',
      'Usually mild',
      'Low',
      ['A cough past two weeks should be examined', 'Breathlessness or blood in sputum: same-day care', 'Steam helps most in the evening'],
      ['Warm water, honey and ginger', 'Salt-water gargle twice a day', 'Sleep with the head raised'],
    );
  }

  if (/(headache|सिरदर्द|migraine)/.test(text)) {
    return guidance(
      'Headache',
      'Usually mild to moderate',
      'Low',
      ['Sudden worst-ever headache: go to the clinic now', 'Headache with vision change or vomiting: same day', 'Rest from screens for an hour in a dark room'],
      ['Cold compress on the forehead', 'Water first, then wait twenty minutes', 'Regular meals, no skipped breakfast'],
    );
  }

  if (/(stomach|पेट|diarrh|loose|vomit)/.test(text)) {
    return guidance(
      'Stomach upset',
      'Usually mild, dehydration is the risk',
      'Medium',
      ['ORS after every loose motion', 'Blood in stool or severe pain: same-day care', 'No food if vomiting, sips of fluid only for two hours'],
      ['Jeera water once cooled', 'Banana, curd and rice as the stomach settles', 'Avoid milk, spicy and oily food for two days'],
    );
  }

  return guidance(
    'Symptoms that do not match a common pattern',
    'Not classifiable here',
    'Medium',
    ['Write down when it started and what makes it worse', 'Book a consult and read the note out to the doctor', 'New swelling, numbness or confusion: same-day care'],
    ['Rest, fluids and regular meals', 'Keep taking any medicine already prescribed', 'Note the pattern for the next two days'],
  );
};

export const saveToStorage = (key: string, data: unknown) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getFromStorage = (key: string): unknown => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

/**
 * National and state coverages that apply in Uttarakhand. Eligibility is decided by the CSC or
 * the district health team, never by this app, so the copy says where to ask instead of
 * guessing from data the platform does not hold.
 */
export const governmentSchemes = [
  {
    name: 'Ayushman Bharat PM-JAY',
    cover: '₹5 lakh per family per year',
    description: 'In-patient care at empanelled government and private hospitals across India. Cover is family-based and decided on SEAD deprivation scores, not on income you declare here.',
    whereToAsk: 'Common Service Centre (CSC) or the empanelled hospital desk, with Aadhaar and one ration or voter ID.',
    benefits: ['Cashless admission', 'Pre and post-hospitalisation days covered', 'No upper age limit or premium'],
  },
  {
    name: 'Mukhyamantri Swasthya Yojana',
    cover: 'Uttarakhand state top-up',
    description: 'State support for treatment costs at Uttarakhand government facilities for residents whose bills fall outside central cover.',
    whereToAsk: 'The civil hospital medical social work desk in your district, or your ANM for a referral.',
    benefits: ['Government facility treatment', 'Referral transport support', 'Works alongside PM-JAY'],
  },
  {
    name: 'Janani Shishu Suraksha Karyakram',
    cover: 'Free delivery and care',
    description: 'Free institutional delivery, C-section, drugs, diagnostics and one day of diet for mother and newborn, with no out-of-pocket charge.',
    whereToAsk: 'Your sub-centre or district hospital at the time of admission.',
    benefits: ['Free delivery including C-section', 'Free diagnostics and drugs', 'Home-to-facility transport'],
  },
];

export const VILLAGES = [
  { name: 'Massoori', district: 'Dehradun' },
  { name: 'Gairsain', district: 'Almora' },
  { name: 'Mana', district: 'Chamoli' },
  { name: 'Devprayag', district: 'Pauri Garhwal' },
  { name: 'Jharigaon', district: 'Uttarkashi' },
];
