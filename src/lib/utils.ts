import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Language translations
export const translations = {
  en: {
    welcome: "Welcome to MediBuddy",
    selectRole: "Select Your Role",
    patient: "Patient",
    doctor: "Doctor", 
    admin: "Admin",
    seller: "Pharmacy",
    login: "Login",
    signup: "Sign Up",
    mobileNumber: "Mobile Number",
    aadharNumber: "Aadhar Number",
    otp: "Enter OTP",
    sendOtp: "Send OTP",
    verify: "Verify",
    symptoms: "Describe your symptoms",
    bookAppointment: "Book Appointment",
    viewRecords: "View Health Records",
    emergencyServices: "Emergency Services",
    governmentSchemes: "Government Schemes",
    medicineAvailability: "Medicine Availability",
    aiSymptomChecker: "AI Symptom Checker",
    language: "Language"
  },
  hi: {
    welcome: "मेडीबडी में आपका स्वागत है",
    selectRole: "अपनी भूमिका चुनें",
    patient: "मरीज़",
    doctor: "डॉक्टर",
    admin: "प्रशासक",
    seller: "दवाखाना",
    login: "लॉग इन",
    signup: "साइन अप",
    mobileNumber: "मोबाइल नंबर",
    aadharNumber: "आधार नंबर",
    otp: "ओटीपी दर्ज करें",
    sendOtp: "ओटीपी भेजें",
    verify: "सत्यापित करें",
    symptoms: "अपने लक्षणों का वर्णन करें",
    bookAppointment: "अपॉइंटमेंट बुक करें",
    viewRecords: "स्वास्थ्य रिकॉर्ड देखें",
    emergencyServices: "आपातकालीन सेवाएं",
    governmentSchemes: "सरकारी योजनाएं",
    medicineAvailability: "दवा उपलब्धता",
    aiSymptomChecker: "एआई लक्षण जांचकर्ता",
    language: "भाषा"
  },
  pa: {
    welcome: "ਮੈਡੀਬੱਡੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ",
    selectRole: "ਆਪਣੀ ਭੂਮਿਕਾ ਚੁਣੋ",
    patient: "ਮਰੀਜ਼",
    doctor: "ਡਾਕਟਰ",
    admin: "ਪ੍ਰਸ਼ਾਸਕ",
    seller: "ਦਵਾਈ ਦੁਕਾਨ",
    login: "ਲਾਗਇਨ",
    signup: "ਸਾਈਨ ਅੱਪ",
    mobileNumber: "ਮੋਬਾਈਲ ਨੰਬਰ",
    aadharNumber: "ਆਧਾਰ ਨੰਬਰ",
    otp: "ਓਟੀਪੀ ਦਾਖਲ ਕਰੋ",
    sendOtp: "ਓਟੀਪੀ ਭੇਜੋ",
    verify: "ਤਸਦੀਕ ਕਰੋ",
    symptoms: "ਆਪਣੇ ਲੱਛਣਾਂ ਦਾ ਵਰਣਨ ਕਰੋ",
    bookAppointment: "ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ",
    viewRecords: "ਸਿਹਤ ਰਿਕਾਰਡ ਦੇਖੋ",
    emergencyServices: "ਐਮਰਜੈਂਸੀ ਸੇਵਾਵਾਂ",
    governmentSchemes: "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ",
    medicineAvailability: "ਦਵਾਈ ਦੀ ਉਪਲਬਧਤਾ",
    aiSymptomChecker: "ਏਆਈ ਲੱਛਣ ਜਾਂਚਕਰਤਾ",
    language: "ਭਾਸ਼ਾ"
  }
};

// Symptom analysis result interface
interface SymptomAnalysis {
  condition: string;
  severity: string;
  recommendations: string[];
  homeRemedies: string[];
  urgency: string;
}

// AI Symptom Analysis - Different responses for different symptoms
export const analyzeSymptoms = (symptoms: string): SymptomAnalysis => {
  const symptomLower = symptoms.toLowerCase();
  
  if (symptomLower.includes('fever') || symptomLower.includes('बुखार') || symptomLower.includes('ਬੁਖਾਰ')) {
    return {
      condition: "Fever",
      severity: "Moderate",
      recommendations: [
        "Rest and stay hydrated",
        "Take paracetamol as per dosage",
        "Monitor temperature regularly",
        "Consult doctor if fever persists >3 days"
      ],
      homeRemedies: [
        "Drink warm water with honey and lemon",
        "Apply cold compress on forehead",
        "Consume light, easily digestible food"
      ],
      urgency: "Medium"
    };
  } else if (symptomLower.includes('cough') || symptomLower.includes('खांसी') || symptomLower.includes('ਖੰਘ')) {
    return {
      condition: "Cough",
      severity: "Mild",
      recommendations: [
        "Stay hydrated with warm liquids",
        "Avoid cold foods and drinks",
        "Use humidifier if available",
        "Consult doctor if cough persists >2 weeks"
      ],
      homeRemedies: [
        "Honey and ginger tea",
        "Steam inhalation with mint leaves",
        "Turmeric milk before bed"
      ],
      urgency: "Low"
    };
  } else if (symptomLower.includes('headache') || symptomLower.includes('सिरदर्द') || symptomLower.includes('ਸਿਰ ਦਰਦ')) {
    return {
      condition: "Headache",
      severity: "Mild to Moderate",
      recommendations: [
        "Rest in a dark, quiet room",
        "Apply cold or warm compress",
        "Stay hydrated",
        "Avoid screen time"
      ],
      homeRemedies: [
        "Peppermint oil massage on temples",
        "Ginger tea",
        "Adequate sleep and regular meals"
      ],
      urgency: "Low"
    };
  } else if (symptomLower.includes('stomach') || symptomLower.includes('पेट') || symptomLower.includes('ਪੇਟ')) {
    return {
      condition: "Stomach Issues",
      severity: "Mild",
      recommendations: [
        "Eat light, bland foods",
        "Stay hydrated with ORS",
        "Avoid spicy and oily foods",
        "Rest and avoid stress"
      ],
      homeRemedies: [
        "Cumin water (jeera water)",
        "Buttermilk with mint",
        "Fennel seeds after meals"
      ],
      urgency: "Medium"
    };
  } else if (symptomLower.includes('chest pain') || symptomLower.includes('सीने में दर्द') || symptomLower.includes('ਛਾਤੀ ਵਿੱਚ ਦਰਦ')) {
    return {
      condition: "Chest Pain",
      severity: "High",
      recommendations: [
        "Seek immediate medical attention",
        "Do not ignore chest pain",
        "Call emergency services",
        "Avoid physical exertion"
      ],
      homeRemedies: [
        "Sit upright and try to stay calm",
        "Loosen tight clothing",
        "Take slow, deep breaths"
      ],
      urgency: "High"
    };
  } else {
    return {
      condition: "General Symptoms",
      severity: "Unknown",
      recommendations: [
        "Monitor your symptoms closely",
        "Maintain a symptom diary",
        "Consult healthcare provider",
        "Stay hydrated and rest"
      ],
      homeRemedies: [
        "Maintain healthy diet",
        "Get adequate sleep",
        "Practice stress management"
      ],
      urgency: "Medium"
    };
  }
};

// Storage utilities
export const saveToStorage = (key: string, data: unknown) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const getFromStorage = (key: string): unknown => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

// Mock data for development
export const mockMedicines = [
  { id: 1, name: "Paracetamol", stock: 500, price: 10, pharmacy: "City Pharmacy" },
  { id: 2, name: "Amoxicillin", stock: 200, price: 45, pharmacy: "Health Plus" },
  { id: 3, name: "Crocin", stock: 300, price: 15, pharmacy: "MedStore" },
  { id: 4, name: "Cetirizine", stock: 150, price: 25, pharmacy: "Care Pharmacy" }
];

export const mockAppointments = [
  { id: 1, doctorName: "Dr. Sharma", date: "2025-01-15", time: "10:00 AM", status: "confirmed" },
  { id: 2, doctorName: "Dr. Patel", date: "2025-01-16", time: "2:00 PM", status: "pending" }
];

export const governmentSchemes = [
  {
    name: "Ayushman Bharat",
    description: "Free healthcare coverage up to ₹5 lakh per family per year",
    eligibility: "BPL families, rural families with specific criteria",
    applicationProcess: "Visit nearest Common Service Center with Aadhar card",
    benefits: ["Free hospitalization", "Pre and post hospitalization expenses", "Day care procedures"]
  },
  {
    name: "Punjab Health Card",
    description: "State health insurance scheme for Punjab residents",
    eligibility: "All Punjab residents with valid address proof",
    applicationProcess: "Apply online at Punjab Health Department portal",
    benefits: ["Cashless treatment", "Coverage for chronic diseases", "Emergency services"]
  }
];