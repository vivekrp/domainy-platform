import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { 
  AuthResponse, 
  RegisterUserInput, 
  DomainWithStatus, 
  AddDomainInput,
  UpdateDomainInput,
  DomainStatus
} from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [domains, setDomains] = useState<DomainWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth form states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState<RegisterUserInput>({
    email: '',
    password: ''
  });

  // Domain form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainWithStatus | null>(null);
  const [domainForm, setDomainForm] = useState<AddDomainInput>({
    domain_name: '',
    registrar: ''
  });

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('domainy_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('domainy_user');
      }
    }
  }, []);

  // Load domains when user is authenticated
  const loadDomains = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getDomains.query();
      setDomains(result);
    } catch (error) {
      console.error('Failed to load domains:', error);
      setError('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDomains();
    }
  }, [user, loadDomains]);

  // Authentication handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let response: AuthResponse;
      
      if (authTab === 'register') {
        response = await trpc.register.mutate(authData);
      } else {
        response = await trpc.login.mutate(authData);
      }

      setUser(response.user);
      localStorage.setItem('domainy_user', JSON.stringify(response.user));
      localStorage.setItem('domainy_token', response.token);
      
      // Reset form
      setAuthData({ email: '', password: '' });
    } catch (error: unknown) {
      console.error('Authentication failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setDomains([]);
    localStorage.removeItem('domainy_user');
    localStorage.removeItem('domainy_token');
  };

  // Domain management handlers
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const newDomain = await trpc.addDomain.mutate(domainForm);
      
      // Transform Domain to DomainWithStatus for consistency
      const domainWithStatus: DomainWithStatus = {
        ...newDomain,
        status: 'unknown' as DomainStatus,
        days_until_expiry: null
      };
      
      setDomains((prev: DomainWithStatus[]) => [...prev, domainWithStatus]);
      setDomainForm({ domain_name: '', registrar: '' });
      setShowAddDialog(false);
      
      // Reload domains to get updated status
      setTimeout(loadDomains, 1000);
    } catch (error: unknown) {
      console.error('Failed to add domain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDomain) return;

    setIsLoading(true);
    setError(null);

    try {
      const updateData: UpdateDomainInput = {
        id: editingDomain.id,
        domain_name: domainForm.domain_name,
        registrar: domainForm.registrar
      };

      await trpc.updateDomain.mutate(updateData);
      
      // Update local state
      setDomains((prev: DomainWithStatus[]) =>
        prev.map((domain: DomainWithStatus) =>
          domain.id === editingDomain.id
            ? { ...domain, domain_name: domainForm.domain_name, registrar: domainForm.registrar }
            : domain
        )
      );
      
      setShowEditDialog(false);
      setEditingDomain(null);
      setDomainForm({ domain_name: '', registrar: '' });
    } catch (error: unknown) {
      console.error('Failed to update domain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update domain';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await trpc.deleteDomain.mutate({ id: domainId });
      setDomains((prev: DomainWithStatus[]) => 
        prev.filter((domain: DomainWithStatus) => domain.id !== domainId)
      );
    } catch (error: unknown) {
      console.error('Failed to delete domain:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete domain';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (domain: DomainWithStatus) => {
    setEditingDomain(domain);
    setDomainForm({
      domain_name: domain.domain_name,
      registrar: domain.registrar
    });
    setShowEditDialog(true);
  };

  // Utility functions
  const getStatusColor = (status: DomainStatus): string => {
    switch (status) {
      case 'red': return 'bg-red-500 text-white';
      case 'orange': return 'bg-orange-500 text-white';
      case 'yellow': return 'bg-yellow-500 text-black';
      case 'green': return 'bg-green-500 text-white';
      case 'blue': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: DomainStatus): string => {
    switch (status) {
      case 'red': return '🔴';
      case 'orange': return '🟠';
      case 'yellow': return '🟡';
      case 'green': return '🟢';
      case 'blue': return '🔵';
      default: return '❓';
    }
  };

  const getStatusLabel = (status: DomainStatus): string => {
    switch (status) {
      case 'red': return 'Expired';
      case 'orange': return 'Expiring Soon';
      case 'yellow': return 'Expiring';
      case 'green': return 'Active';
      case 'blue': return 'Redemption';
      default: return 'Unknown';
    }
  };

  const formatExpiryInfo = (domain: DomainWithStatus): string => {
    if (!domain.expiry_date) return 'Unknown expiry date';
    
    const expiry = new Date(domain.expiry_date);
    const days = domain.days_until_expiry;
    
    if (days === null) return `Expires: ${expiry.toLocaleDateString()}`;
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today!';
    return `Expires in ${days} days`;
  };

  // Authentication UI
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-indigo-900">
              🌐 Domainy
            </CardTitle>
            <CardDescription>
              Manage your domains with ease
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authTab} onValueChange={(value: string) => setAuthTab(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleAuth} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={authData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthData((prev: RegisterUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={authData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAuthData((prev: RegisterUserInput) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Please wait...' : authTab === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main dashboard UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-indigo-900">🌐 Domainy</h1>
              <Badge variant="secondary">{domains.length} domains</Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}!</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions bar */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Domains</h2>
            <p className="text-gray-600">Monitor and manage your domain portfolio</p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary focus-ring">
                <span className="mr-2">🌐</span>
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Domain</DialogTitle>
                <DialogDescription>
                  Enter your domain details. We'll automatically fetch WHOIS information.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddDomain} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain_name">Domain Name</Label>
                  <Input
                    id="domain_name"
                    value={domainForm.domain_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDomainForm((prev: AddDomainInput) => ({ ...prev, domain_name: e.target.value }))
                    }
                    placeholder="example.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrar">Registrar</Label>
                  <Input
                    id="registrar"
                    value={domainForm.registrar}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDomainForm((prev: AddDomainInput) => ({ ...prev, registrar: e.target.value }))
                    }
                    placeholder="GoDaddy, Namecheap, etc."
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Domain'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Domains grid */}
        {isLoading && domains.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading your domains...</div>
          </div>
        ) : domains.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No domains yet</h3>
              <p className="text-gray-600 mb-4">
                Start by adding your first domain to monitor its expiry and details.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                Add Your First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {domains.map((domain: DomainWithStatus) => (
              <Card key={domain.id} className={`domain-card hover:shadow-lg transition-all duration-300 ${domain.status === 'red' ? 'domain-status-red' : domain.status === 'orange' ? 'domain-status-orange' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">{getStatusIcon(domain.status)}</span>
                        <span className="domain-name">{domain.domain_name}</span>
                      </CardTitle>
                      <CardDescription>
                        Registered with {domain.registrar}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(domain.status)}>
                      {getStatusLabel(domain.status)}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{formatExpiryInfo(domain)}</span>
                    </div>
                    
                    {domain.expiry_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expires:</span>
                        <span>{new Date(domain.expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Added:</span>
                      <span>{new Date(domain.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(domain)}
                    >
                      ✏️ Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          🗑️ Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove <strong>{domain.domain_name}</strong> from your portfolio? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteDomain(domain.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit domain dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Domain</DialogTitle>
              <DialogDescription>
                Update your domain information.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleEditDomain} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_domain_name">Domain Name</Label>
                <Input
                  id="edit_domain_name"
                  value={domainForm.domain_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDomainForm((prev: AddDomainInput) => ({ ...prev, domain_name: e.target.value }))
                  }
                  placeholder="example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_registrar">Registrar</Label>
                <Input
                  id="edit_registrar"
                  value={domainForm.registrar}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDomainForm((prev: AddDomainInput) => ({ ...prev, registrar: e.target.value }))
                  }
                  placeholder="GoDaddy, Namecheap, etc."
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingDomain(null);
                    setDomainForm({ domain_name: '', registrar: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Domain'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default App;