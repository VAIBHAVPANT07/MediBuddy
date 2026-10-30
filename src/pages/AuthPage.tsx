import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translations, speakText, saveToStorage } from '@/lib/utils';
import { User, Stethoscope, Shield, Store, Volume2, Globe } from 'lucide-react';

interface AuthPageProps {
  onLogin: (role: string) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [step, setStep] = useState<'role' | 'login' | 'signup' | 'otp'>('role');
  const [formData, setFormData] = useState({
    mobile: '',
    aadhar: '',
    otp: ''
  });

  const t = translations[currentLang];

  const roles = [
    { id: 'patient', name: t.patient, icon: User, color: 'bg-green-500', description: 'Book appointments, check symptoms' },
    { id: 'doctor', name: t.doctor, icon: Stethoscope, color: 'bg-blue-500', description: 'Manage patients, consultations' },
    { id: 'admin', name: t.admin, icon: Shield, color: 'bg-orange-500', description: 'Analytics, resource management' },
    { id: 'seller', name: t.seller, icon: Store, color: 'bg-purple-500', description: 'Medicine inventory, sales' }
  ];

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setStep('login');
  };

  const handleSendOtp = () => {
    if (formData.mobile.length === 10) {
      // Mock OTP send
      setStep('otp');
      speakText('OTP sent to your mobile number', currentLang);
    }
  };

  const handleVerifyOtp = () => {
    if (formData.otp === '1234') { // Mock OTP verification
      saveToStorage('userRole', selectedRole);
      saveToStorage('userMobile', formData.mobile);
      saveToStorage('userAadhar', formData.aadhar);
      onLogin(selectedRole);
    }
  };

  const speak = (text: string) => {
    speakText(text, currentLang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="flex items-center gap-4">
              <Select value={currentLang} onValueChange={(value: 'en' | 'hi' | 'pa') => setCurrentLang(value)}>
                <SelectTrigger className="w-32">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिंदी</SelectItem>
                  <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-green-600">MediBuddy</h1>
            <Button variant="ghost" size="sm" onClick={() => speak(t.welcome)}>
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            {t.welcome}
            <Button variant="ghost" size="sm" onClick={() => speak(t.welcome)}>
              <Volume2 className="w-4 h-4" />
            </Button>
          </p>
        </div>

        {/* Role Selection */}
        {step === 'role' && (
          <div>
            <h2 className="text-2xl font-semibold text-center mb-6 flex items-center justify-center gap-2">
              {t.selectRole}
              <Button variant="ghost" size="sm" onClick={() => speak(t.selectRole)}>
                <Volume2 className="w-4 h-4" />
              </Button>
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {roles.map((role) => (
                <Card 
                  key={role.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-gray-300"
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 ${role.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <role.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="flex items-center justify-center gap-2">
                      {role.name}
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        speak(role.name);
                      }}>
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2">
                      {role.description}
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        speak(role.description);
                      }}>
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Login Form */}
        {step === 'login' && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.login} - {roles.find(r => r.id === selectedRole)?.name}
                <Button variant="ghost" size="sm" onClick={() => speak(`${t.login} ${roles.find(r => r.id === selectedRole)?.name}`)}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  {t.mobileNumber}
                  <Button variant="ghost" size="sm" onClick={() => speak(t.mobileNumber)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </label>
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  maxLength={10}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  {t.aadharNumber}
                  <Button variant="ghost" size="sm" onClick={() => speak(t.aadharNumber)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </label>
                <Input
                  type="text"
                  placeholder="12-digit Aadhar number"
                  value={formData.aadhar}
                  onChange={(e) => setFormData({...formData, aadhar: e.target.value})}
                  maxLength={12}
                />
              </div>

              <Button 
                onClick={handleSendOtp} 
                className="w-full"
                disabled={formData.mobile.length !== 10 || formData.aadhar.length !== 12}
              >
                {t.sendOtp}
              </Button>

              <Button variant="outline" onClick={() => setStep('role')} className="w-full">
                Back to Role Selection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* OTP Verification */}
        {step === 'otp' && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.verify}
                <Button variant="ghost" size="sm" onClick={() => speak(t.verify)}>
                  <Volume2 className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                OTP sent to {formData.mobile}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  {t.otp}
                  <Button variant="ghost" size="sm" onClick={() => speak(t.otp)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </label>
                <Input
                  type="text"
                  placeholder="Enter 4-digit OTP (use 1234 for demo)"
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  maxLength={4}
                />
              </div>

              <Button 
                onClick={handleVerifyOtp} 
                className="w-full"
                disabled={formData.otp.length !== 4}
              >
                {t.verify}
              </Button>

              <Button variant="outline" onClick={() => setStep('login')} className="w-full">
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}