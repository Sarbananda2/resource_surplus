import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Package, ArrowRight, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { SiGoogle } from "react-icons/si";

export default function AuthPage() {
  const { user, isLoading, login, register, loginMutation, registerMutation, googleSignIn, googleSignInMutation, isFirebaseConfigured } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // Determine default tab from query param
  const params = new URLSearchParams(searchString);
  const defaultTab = params.get("mode") === "login" ? "login" : "register";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const mode = params.get("mode");
    if (mode === "login") {
      setActiveTab("login");
    }
  }, [searchString]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register({ email: registerEmail, password: registerPassword, firstName, lastName });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col p-8">
        <Link href="/" className="flex items-center gap-2 mb-8 hover-elevate w-fit rounded-md p-2 -ml-2" data-testid="link-home">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-lg font-medium">SurplusFlow</span>
        </Link>
        <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to SurplusFlow</CardTitle>
            <CardDescription>
              Sign in or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {loginMutation.error?.message || "Login failed"}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email" required>Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" required>Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {registerMutation.isError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {registerMutation.error?.message || "Registration failed"}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" required>First Name</Label>
                      <Input
                        id="first-name"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" required>Last Name</Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" required>Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" required>Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      data-testid="input-register-password"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t">
              <p className="text-center text-sm text-muted-foreground mb-4">
                Or continue with
              </p>
              <div className="space-y-3">
                {isFirebaseConfigured && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => googleSignIn()}
                    disabled={googleSignInMutation.isPending}
                    data-testid="button-google-auth"
                  >
                    {googleSignInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <SiGoogle className="mr-2 h-4 w-4" />
                        Sign in with Google
                      </>
                    )}
                  </Button>
                )}
                {googleSignInMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {googleSignInMutation.error?.message || "Google sign-in failed"}
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-replit-auth"
                >
                  Sign in with Replit
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Developer Test Accounts</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Password</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs py-2">Donor</TableCell>
                    <TableCell className="text-xs py-2 font-mono">donor@test.com</TableCell>
                    <TableCell className="text-xs py-2 font-mono">password123</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs py-2">NGO</TableCell>
                    <TableCell className="text-xs py-2 font-mono">ngo@test.com</TableCell>
                    <TableCell className="text-xs py-2 font-mono">password123</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs py-2">Agent</TableCell>
                    <TableCell className="text-xs py-2 font-mono">agent@test.com</TableCell>
                    <TableCell className="text-xs py-2 font-mono">password123</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center bg-muted p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Package className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">
            Surplus Redistribution Made Transparent
          </h2>
          <p className="text-muted-foreground">
            Connect donors, NGOs, and delivery agents to ensure surplus items 
            reach those in need with full chain-of-custody visibility.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">Donors</div>
              <p className="text-sm text-muted-foreground">Declare surplus</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">NGOs</div>
              <p className="text-sm text-muted-foreground">Distribute to need</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">Agents</div>
              <p className="text-sm text-muted-foreground">Handle logistics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
