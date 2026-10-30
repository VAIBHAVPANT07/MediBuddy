import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFromStorage } from '@/lib/utils';
import { 
  Shield, 
  BarChart3, 
  Users, 
  Activity, 
  Download,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';

interface AdminPortalProps {
  onLogout: () => void;
}

export default function AdminPortal({ onLogout }: AdminPortalProps) {
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [reportType, setReportType] = useState('health');

  const userMobile = getFromStorage('userMobile') || '9876543210';

  const healthStats = {
    totalPatients: 1250,
    activeConsultations: 45,
    emergencyCases: 8,
    vaccinationRate: 78
  };

  const villageData = [
    { name: 'Rampur', patients: 320, diseases: ['Fever: 15', 'Hypertension: 8', 'Diabetes: 12'], medicines: 85 },
    { name: 'Sultanpur', patients: 280, diseases: ['Cough: 22', 'Skin Issues: 6', 'Fever: 9'], medicines: 92 },
    { name: 'Krishnapur', patients: 195, diseases: ['Diabetes: 18', 'Heart Issues: 4', 'Fever: 7'], medicines: 78 }
  ];

  const resourceData = [
    { type: 'Doctors', available: 12, total: 15, status: 'good' },
    { type: 'Nurses', available: 25, total: 30, status: 'good' },
    { type: 'Ambulances', available: 3, total: 5, status: 'warning' },
    { type: 'Medicine Stock', available: 85, total: 100, status: 'good' }
  ];

  const generateReport = () => {
    const reportData = {
      type: reportType,
      village: selectedVillage,
      generatedAt: new Date().toISOString(),
      data: selectedVillage === 'all' ? villageData : villageData.filter(v => v.name.toLowerCase() === selectedVillage)
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report-${selectedVillage}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('Report generated and downloaded successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-orange-600 flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Admin Portal
            </h1>
            <p className="text-gray-600">Administrator #{userMobile}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{healthStats.totalPatients}</p>
                  <p className="text-sm text-gray-600">Total Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{healthStats.activeConsultations}</p>
                  <p className="text-sm text-gray-600">Active Consultations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{healthStats.emergencyCases}</p>
                  <p className="text-sm text-gray-600">Emergency Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{healthStats.vaccinationRate}%</p>
                  <p className="text-sm text-gray-600">Vaccination Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">Health Analytics</TabsTrigger>
            <TabsTrigger value="villages">Village Data</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Health Analytics */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Disease Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Fever Cases</span>
                      <Badge variant="destructive">↑ 15%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Hypertension</span>
                      <Badge variant="secondary">→ 2%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span>Diabetes</span>
                      <Badge variant="default">↓ 8%</Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '35%'}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Monday</span>
                      <span className="text-sm font-medium">45 consultations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tuesday</span>
                      <span className="text-sm font-medium">52 consultations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Wednesday</span>
                      <span className="text-sm font-medium">38 consultations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Thursday</span>
                      <span className="text-sm font-medium">61 consultations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Friday</span>
                      <span className="text-sm font-medium">48 consultations</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Village Data */}
          <TabsContent value="villages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Village Health Overview
                </CardTitle>
                <CardDescription>Real-time health data by village</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {villageData.map((village, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{village.name}</h4>
                          <p className="text-sm text-gray-600">{village.patients} registered patients</p>
                        </div>
                        <Badge variant={village.medicines > 80 ? 'default' : 'destructive'}>
                          Medicine Stock: {village.medicines}%
                        </Badge>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Common Diseases:</h5>
                        <div className="flex flex-wrap gap-2">
                          {village.diseases.map((disease, i) => (
                            <Badge key={i} variant="outline">{disease}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources */}
          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Resource Monitoring</CardTitle>
                <CardDescription>Live monitoring of healthcare resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resourceData.map((resource, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{resource.type}</p>
                        <p className="text-sm text-gray-600">
                          {resource.available} / {resource.total} available
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              resource.status === 'good' ? 'bg-green-600' : 
                              resource.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{width: `${(resource.available / resource.total) * 100}%`}}
                          ></div>
                        </div>
                        <Badge variant={
                          resource.status === 'good' ? 'default' : 
                          resource.status === 'warning' ? 'secondary' : 'destructive'
                        }>
                          {resource.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Generate Reports
                </CardTitle>
                <CardDescription>Download health and resource reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Report Type</label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="health">Health Analytics</SelectItem>
                        <SelectItem value="resources">Resource Status</SelectItem>
                        <SelectItem value="vaccination">Vaccination Records</SelectItem>
                        <SelectItem value="medicine">Medicine Inventory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Village/Block</label>
                    <Select value={selectedVillage} onValueChange={setSelectedVillage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Villages</SelectItem>
                        <SelectItem value="rampur">Rampur</SelectItem>
                        <SelectItem value="sultanpur">Sultanpur</SelectItem>
                        <SelectItem value="krishnapur">Krishnapur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={generateReport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}