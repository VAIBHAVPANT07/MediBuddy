import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getFromStorage, saveToStorage } from '@/lib/utils';
import { 
  Store, 
  Package, 
  TrendingUp, 
  Plus,
  Edit,
  Download,
  Search
} from 'lucide-react';

interface SellerPortalProps {
  onLogout: () => void;
}

interface Medicine {
  id: number;
  name: string;
  stock: number;
  price: number;
  category: string;
  expiry: string;
}

export default function SellerPortal({ onLogout }: SellerPortalProps) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = getFromStorage('pharmacyInventory') as Medicine[];
    return saved || [
      { id: 1, name: 'Paracetamol', stock: 15000, price: 10, category: 'Pain Relief', expiry: '2025-12-31' },
      { id: 2, name: 'Amoxicillin', stock: 8500, price: 45, category: 'Antibiotic', expiry: '2025-08-15' },
      { id: 3, name: 'Cetirizine', stock: 12000, price: 25, category: 'Allergy', expiry: '2026-03-20' },
      { id: 4, name: 'Metformin', stock: 9800, price: 35, category: 'Diabetes', expiry: '2025-11-10' }
    ];
  });

  const [newMedicine, setNewMedicine] = useState({
    name: '',
    stock: 15000,
    price: 0,
    category: '',
    expiry: ''
  });

  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const userMobile = (getFromStorage('userMobile') as string) || '9876543210';

  const salesData = [
    { date: '2025-01-10', medicine: 'Paracetamol', quantity: 50, buyer: 'Rajesh Kumar', amount: 500 },
    { date: '2025-01-09', medicine: 'Amoxicillin', quantity: 20, buyer: 'Priya Sharma', amount: 900 },
    { date: '2025-01-08', medicine: 'Cetirizine', quantity: 30, buyer: 'Amit Singh', amount: 750 }
  ];

  const addMedicine = () => {
    if (newMedicine.name && newMedicine.price > 0) {
      const medicine: Medicine = {
        id: Date.now(),
        ...newMedicine
      };
      const updatedMedicines = [...medicines, medicine];
      setMedicines(updatedMedicines);
      saveToStorage('pharmacyInventory', updatedMedicines);
      
      setNewMedicine({
        name: '',
        stock: 15000,
        price: 0,
        category: '',
        expiry: ''
      });
      setIsAddDialogOpen(false);
      alert('Medicine added successfully!');
    }
  };

  const updateMedicine = () => {
    if (editingMedicine) {
      const updatedMedicines = medicines.map(med => 
        med.id === editingMedicine.id ? editingMedicine : med
      );
      setMedicines(updatedMedicines);
      saveToStorage('pharmacyInventory', updatedMedicines);
      
      setEditingMedicine(null);
      setIsEditDialogOpen(false);
      alert('Medicine updated successfully!');
    }
  };

  const generateStockReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      pharmacy: `Pharmacy ${userMobile}`,
      totalMedicines: medicines.length,
      totalValue: medicines.reduce((sum, med) => sum + (med.stock * med.price), 0),
      inventory: medicines,
      salesSummary: salesData
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('Stock report downloaded successfully!');
  };

  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalInventoryValue = medicines.reduce((sum, med) => sum + (med.stock * med.price), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-600 flex items-center gap-2">
              <Store className="w-8 h-8" />
              Pharmacy Portal
            </h1>
            <p className="text-gray-600">Pharmacy #{userMobile}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{medicines.length}</p>
                  <p className="text-sm text-gray-600">Total Medicines</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">₹{totalInventoryValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Inventory Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-2xl font-bold">{salesData.length}</p>
                <p className="text-sm text-gray-600">Today's Sales</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-2xl font-bold">
                  ₹{salesData.reduce((sum, sale) => sum + sale.amount, 0)}
                </p>
                <p className="text-sm text-gray-600">Today's Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="sales">Sales Ledger</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Inventory Management */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Medicine Inventory
                    </CardTitle>
                    <CardDescription>Manage your medicine stock</CardDescription>
                  </div>
                  
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Medicine
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Medicine</DialogTitle>
                        <DialogDescription>Enter medicine details to add to inventory</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="Medicine Name"
                          value={newMedicine.name}
                          onChange={(e) => setNewMedicine({...newMedicine, name: e.target.value})}
                        />
                        <Input
                          type="number"
                          placeholder="Stock Quantity"
                          value={newMedicine.stock}
                          onChange={(e) => setNewMedicine({...newMedicine, stock: parseInt(e.target.value) || 15000})}
                        />
                        <Input
                          type="number"
                          placeholder="Price per unit"
                          value={newMedicine.price}
                          onChange={(e) => setNewMedicine({...newMedicine, price: parseFloat(e.target.value) || 0})}
                        />
                        <Input
                          placeholder="Category"
                          value={newMedicine.category}
                          onChange={(e) => setNewMedicine({...newMedicine, category: e.target.value})}
                        />
                        <Input
                          type="date"
                          placeholder="Expiry Date"
                          value={newMedicine.expiry}
                          onChange={(e) => setNewMedicine({...newMedicine, expiry: e.target.value})}
                        />
                        <Button onClick={addMedicine} className="w-full">
                          Add Medicine
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search medicines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {filteredMedicines.map((medicine) => (
                    <div key={medicine.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{medicine.name}</p>
                            <p className="text-sm text-gray-600">{medicine.category}</p>
                          </div>
                          <Badge variant={medicine.stock > 5000 ? 'default' : medicine.stock > 1000 ? 'secondary' : 'destructive'}>
                            Stock: {medicine.stock}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">₹{medicine.price}</p>
                          <p className="text-xs text-gray-500">Exp: {medicine.expiry}</p>
                        </div>
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMedicine({...medicine})}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Medicine</DialogTitle>
                              <DialogDescription>Update medicine details</DialogDescription>
                            </DialogHeader>
                            {editingMedicine && (
                              <div className="space-y-4">
                                <Input
                                  placeholder="Medicine Name"
                                  value={editingMedicine.name}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, name: e.target.value})}
                                />
                                <Input
                                  type="number"
                                  placeholder="Stock Quantity"
                                  value={editingMedicine.stock}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, stock: parseInt(e.target.value) || 0})}
                                />
                                <Input
                                  type="number"
                                  placeholder="Price per unit"
                                  value={editingMedicine.price}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, price: parseFloat(e.target.value) || 0})}
                                />
                                <Input
                                  placeholder="Category"
                                  value={editingMedicine.category}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, category: e.target.value})}
                                />
                                <Input
                                  type="date"
                                  value={editingMedicine.expiry}
                                  onChange={(e) => setEditingMedicine({...editingMedicine, expiry: e.target.value})}
                                />
                                <Button onClick={updateMedicine} className="w-full">
                                  Update Medicine
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Ledger */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Ledger</CardTitle>
                <CardDescription>Track all medicine sales with buyer details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesData.map((sale, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{sale.medicine}</p>
                        <p className="text-sm text-gray-600">Buyer: {sale.buyer}</p>
                        <p className="text-xs text-gray-500">{sale.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{sale.amount}</p>
                        <p className="text-sm text-gray-600">Qty: {sale.quantity}</p>
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
                <CardDescription>Download stock and sales reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={generateStockReport} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Stock Report
                </Button>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Inventory Summary</h4>
                      <p className="text-sm text-gray-600">Total Medicines: {medicines.length}</p>
                      <p className="text-sm text-gray-600">Total Value: ₹{totalInventoryValue.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Sales Summary</h4>
                      <p className="text-sm text-gray-600">Today's Sales: {salesData.length}</p>
                      <p className="text-sm text-gray-600">Revenue: ₹{salesData.reduce((sum, sale) => sum + sale.amount, 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Levels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {medicines.slice(0, 4).map((medicine) => (
                      <div key={medicine.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{medicine.name}</span>
                          <span className="text-sm">{medicine.stock} units</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              medicine.stock > 10000 ? 'bg-green-600' : 
                              medicine.stock > 5000 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{width: `${Math.min((medicine.stock / 15000) * 100, 100)}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Medicines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Paracetamol</span>
                      <Badge>150 sold</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cetirizine</span>
                      <Badge variant="secondary">89 sold</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Amoxicillin</span>
                      <Badge variant="secondary">67 sold</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Metformin</span>
                      <Badge variant="secondary">45 sold</Badge>
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