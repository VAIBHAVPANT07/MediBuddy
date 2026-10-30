import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations, speakText, analyzeSymptoms, mockMedicines, mockAppointments, governmentSchemes, getFromStorage } from '@/lib/utils';
import { 
  Heart, 
  Calendar, 
  FileText, 
  Pill, 
  Phone, 
  Ambulance, 
  Car, 
  Volume2, 
  Mic, 
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';

interface PatientPortalProps {
  onLogout: () => void;
}

interface SymptomAnalysis {
  condition: string;
  severity: string;
  recommendations: string[];
  homeRemedies: string[];
  urgency: string;
}

export default function PatientPortal({ onLogout }: PatientPortalProps) {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');

  const t = translations[currentLang];
  const userMobile = (getFromStorage('userMobile') as string) || '9876543210';

  const speak = (text: string) => {
    speakText(text, currentLang);
  };

  const handleSymptomAnalysis = () => {
    if (symptoms.trim()) {
      const result = analyzeSymptoms(symptoms);
      setAnalysis(result);
      speak(`Analysis complete. You may have ${result.condition}. Severity: ${result.severity}`);
    }
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'pa' ? 'pa-IN' : 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSymptoms(transcript);
      };
      recognition.start();
    }
  };

  const bookAppointment = () => {
    if (selectedDoctor && appointmentDate && appointmentTime) {
      const appointment = {
        id: Date.now(),
        doctorName: selectedDoctor,
        date: appointmentDate,
        time: appointmentTime,
        status: 'confirmed'
      };
      const existingAppointments = (getFromStorage('userAppointments') as any[]) || [];
      existingAppointments.push(appointment);
      localStorage.setItem('userAppointments', JSON.stringify(existingAppointments));
      
      speak('Appointment booked successfully');
      alert('Appointment booked successfully!');
      
      setSelectedDoctor('');
      setAppointmentDate('');
      setAppointmentTime('');
    }
  };

  const callEmergency = (service: string) => {
    speak(`Calling ${service} service`);
    alert(`Calling ${service} service - Feature will connect to actual service`);
  };

  const downloadHealthRecord = () => {
    const healthData = {
      patientId: userMobile,
      records: [
        { date: '2025-01-10', type: 'Checkup', doctor: 'Dr. Sharma', notes: 'Regular checkup - all normal' },
        { date: '2025-01-05', type: 'Blood Test', results: 'Hemoglobin: 12.5 g/dL, Normal' }
      ]
    };
    
    const dataStr = JSON.stringify(healthData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'health-records.json';
    link.click();
    
    speak('Health records downloaded');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-green-600 flex items-center gap-2">
              <Heart className="w-8 h-8" />
              Patient Portal
              <Button variant="ghost" size="sm" onClick={() => speak('Patient Portal')}>
                <Volume2 className="w-4 h-4" />
              </Button>
            </h1>
            <p className="text-gray-600">Welcome, Patient #{userMobile}</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={currentLang} onValueChange={(value: 'en' | 'hi' | 'pa') => setCurrentLang(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>

        <Tabs defaultValue="symptoms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="symptoms">AI Symptom Checker</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="records">Health Records</TabsTrigger>
            <TabsTrigger value="medicines">Medicines</TabsTrigger>
            <TabsTrigger value="schemes">Gov Schemes</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>

          {/* AI Symptom Checker */}
          <TabsContent value="symptoms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t.aiSymptomChecker}
                  <Button variant="ghost" size="sm" onClick={() => speak(t.aiSymptomChecker)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
                <CardDescription>Describe your symptoms for AI analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={t.symptoms}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={startVoiceInput}
                    disabled={isListening}
                  >
                    <Mic className={`w-4 h-4 ${isListening ? 'text-red-500' : ''}`} />
                  </Button>
                </div>
                
                <Button onClick={handleSymptomAnalysis} disabled={!symptoms.trim()}>
                  Analyze Symptoms
                </Button>

                {analysis && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Analysis Results
                        <Badge variant={analysis.urgency === 'High' ? 'destructive' : analysis.urgency === 'Medium' ? 'default' : 'secondary'}>
                          {analysis.urgency} Priority
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold">Possible Condition: {analysis.condition}</h4>
                        <p className="text-sm text-gray-600">Severity: {analysis.severity}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          Recommendations
                          <Button variant="ghost" size="sm" onClick={() => speak(analysis.recommendations.join('. '))}>
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {analysis.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          Home Remedies
                          <Button variant="ghost" size="sm" onClick={() => speak(analysis.homeRemedies.join('. '))}>
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {analysis.homeRemedies.map((remedy: string, index: number) => (
                            <li key={index}>{remedy}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments */}
          <TabsContent value="appointments">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Book New Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr. Sharma">Dr. Sharma - General Medicine</SelectItem>
                      <SelectItem value="Dr. Patel">Dr. Patel - Pediatrics</SelectItem>
                      <SelectItem value="Dr. Singh">Dr. Singh - Cardiology</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                  />
                  
                  <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                      <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                      <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                      <SelectItem value="04:00 PM">04:00 PM</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={bookAppointment} className="w-full">
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{apt.doctorName}</p>
                          <p className="text-sm text-gray-600">{apt.date} at {apt.time}</p>
                        </div>
                        <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Health Records */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Digital Health Records
                  <Button onClick={downloadHealthRecord} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Records
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Regular Checkup</h4>
                      <span className="text-sm text-gray-600">Jan 10, 2025</span>
                    </div>
                    <p className="text-sm">Dr. Sharma - All vitals normal, continue current medication</p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Blood Test Results</h4>
                      <span className="text-sm text-gray-600">Jan 5, 2025</span>
                    </div>
                    <p className="text-sm">Hemoglobin: 12.5 g/dL (Normal), Sugar: 95 mg/dL (Normal)</p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Upload Lab Reports, X-rays, or Prescriptions</p>
                    <Button variant="outline" className="mt-2">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medicine Availability */}
          <TabsContent value="medicines">
            <Card>
              <CardHeader>
                <CardTitle>Medicine Availability</CardTitle>
                <CardDescription>Check medicine stock in nearby pharmacies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input placeholder="Search medicine..." />
                </div>
                <div className="space-y-3">
                  {mockMedicines.map((med) => (
                    <div key={med.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-gray-600">{med.pharmacy}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{med.price}</p>
                        <Badge variant={med.stock > 100 ? 'default' : med.stock > 0 ? 'secondary' : 'destructive'}>
                          Stock: {med.stock}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Government Schemes */}
          <TabsContent value="schemes">
            <div className="space-y-4">
              {governmentSchemes.map((scheme, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {scheme.name}
                      <Button variant="ghost" size="sm" onClick={() => speak(scheme.name)}>
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>{scheme.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-semibold">Eligibility:</h4>
                      <p className="text-sm">{scheme.eligibility}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">How to Apply:</h4>
                      <p className="text-sm">{scheme.applicationProcess}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Benefits:</h4>
                      <ul className="list-disc list-inside text-sm">
                        {scheme.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                    <Button className="w-full">Check Eligibility</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Emergency Services */}
          <TabsContent value="emergency">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <Ambulance className="w-6 h-6" />
                    Emergency Ambulance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">24/7 Emergency medical transport service</p>
                  <Button 
                    onClick={() => callEmergency('Ambulance')} 
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Ambulance
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-orange-600 flex items-center gap-2">
                    <Car className="w-6 h-6" />
                    Rickshaw Booking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">Quick transport to nearest healthcare facility</p>
                  <Button 
                    onClick={() => callEmergency('Rickshaw')} 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Book Rickshaw
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}