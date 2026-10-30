import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations, speakText, getFromStorage } from '@/lib/utils';
import { 
  Stethoscope, 
  Calendar, 
  FileText, 
  Video, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Download
} from 'lucide-react';

interface DoctorPortalProps {
  onLogout: () => void;
}

export default function DoctorPortal({ onLogout }: DoctorPortalProps) {
  const [selectedPatient, setSelectedPatient] = useState('');
  const [prescription, setPrescription] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');

  const userMobile = getFromStorage('userMobile') || '9876543210';

  const mockPatients = [
    { id: 1, name: 'Rajesh Kumar', age: 45, condition: 'Hypertension', lastVisit: '2025-01-10' },
    { id: 2, name: 'Priya Sharma', age: 32, condition: 'Diabetes', lastVisit: '2025-01-08' },
    { id: 3, name: 'Amit Singh', age: 28, condition: 'Fever', lastVisit: '2025-01-12' }
  ];

  const mockAppointments = [
    { id: 1, patientName: 'Rajesh Kumar', time: '10:00 AM', type: 'Follow-up', status: 'confirmed' },
    { id: 2, patientName: 'Priya Sharma', time: '11:30 AM', type: 'Consultation', status: 'pending' },
    { id: 3, patientName: 'Amit Singh', time: '2:00 PM', type: 'Check-up', status: 'confirmed' }
  ];

  const savePrescription = () => {
    if (selectedPatient && prescription) {
      const prescriptionData = {
        patientId: selectedPatient,
        prescription,
        notes: consultationNotes,
        date: new Date().toISOString().split('T')[0],
        doctorId: userMobile
      };
      
      const existingPrescriptions = getFromStorage('prescriptions') || [];
      existingPrescriptions.push(prescriptionData);
      localStorage.setItem('prescriptions', JSON.stringify(existingPrescriptions));
      
      alert('Prescription saved successfully!');
      setPrescription('');
      setConsultationNotes('');
      setSelectedPatient('');
    }
  };

  const startVideoCall = (patientName: string) => {
    alert(`Starting video consultation with ${patientName} - Feature will connect to video service`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 flex items-center gap-2">
              <Stethoscope className="w-8 h-8" />
              Doctor Portal
            </h1>
            <p className="text-gray-600">Dr. {userMobile}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="consultations">Consultations</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          </TabsList>

          {/* Appointments Management */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Appointments
                </CardTitle>
                <CardDescription>Manage your scheduled appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{apt.time}</span>
                        </div>
                        <div>
                          <p className="font-medium">{apt.patientName}</p>
                          <p className="text-sm text-gray-600">{apt.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                          {apt.status}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => startVideoCall(apt.patientName)}
                          className="flex items-center gap-1"
                        >
                          <Video className="w-4 h-4" />
                          Start Call
                        </Button>
                        <Button size="sm" variant="outline">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patient Records */}
          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Patient Records
                </CardTitle>
                <CardDescription>Access patient medical history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input placeholder="Search patients..." />
                </div>
                <div className="space-y-4">
                  {mockPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-gray-600">Age: {patient.age} | Condition: {patient.condition}</p>
                        <p className="text-xs text-gray-500">Last Visit: {patient.lastVisit}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          View History
                        </Button>
                        <Button size="sm">
                          <Video className="w-4 h-4 mr-1" />
                          Consult
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Consultations */}
          <TabsContent value="consultations">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Video Consultation</CardTitle>
                  <CardDescription>Low-bandwidth optimized video calls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="bg-gray-100 aspect-video rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Video call will appear here</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Video className="w-4 h-4 mr-2" />
                      Start Call
                    </Button>
                    <Button variant="outline">
                      End Call
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consultation Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter consultation notes..."
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    rows={8}
                  />
                  <Button className="w-full">
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Digital Prescriptions */}
          <TabsContent value="prescriptions">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Prescription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Textarea
                    placeholder="Enter prescription details..."
                    value={prescription}
                    onChange={(e) => setPrescription(e.target.value)}
                    rows={6}
                  />
                  
                  <Textarea
                    placeholder="Additional notes..."
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    rows={3}
                  />
                  
                  <div className="flex gap-2">
                    <Button onClick={savePrescription} className="flex-1">
                      Save Prescription
                    </Button>
                    <Button variant="outline">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Prescriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">Rajesh Kumar</p>
                        <span className="text-xs text-gray-500">Jan 10, 2025</span>
                      </div>
                      <p className="text-sm text-gray-600">Amlodipine 5mg - Once daily</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">Priya Sharma</p>
                        <span className="text-xs text-gray-500">Jan 8, 2025</span>
                      </div>
                      <p className="text-sm text-gray-600">Metformin 500mg - Twice daily</p>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}