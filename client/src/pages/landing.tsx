import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, Truck, ArrowRight, Shield, Eye, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="text-xl font-medium">SurplusFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button data-testid="button-login" onClick={() => window.location.href = "/auth?mode=login"}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-medium tracking-tight mb-6">
              Connect Surplus to Purpose
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A transparency-driven platform that connects donors with NGOs through verified delivery, 
              ensuring your surplus items reach people who need them.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button 
                size="lg" 
                data-testid="button-get-started"
                onClick={() => window.location.href = "/auth"}
                className="gap-2"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a 
                  href="/auth?mode=login" 
                  className="text-primary underline-offset-4 hover:underline"
                  data-testid="link-sign-in"
                >
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-medium text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Donors</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base">
                    Declare usable surplus items in minutes. No coordination needed—just list what you have and when it's available.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Truck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Delivery Agents</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base">
                    Pick up items from donors and deliver to NGO warehouses with photo proof at every step.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">NGOs</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base">
                    Accept donations based on capacity, manage warehouse inventory, and publish distribution events.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-medium text-center mb-12">Built on Trust</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Eye className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Full Transparency</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your donation from listing to distribution with photo proof at each step.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Privacy Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    Beneficiary dignity preserved through aggregated distribution events—no individual tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Area-Level Only</h3>
                  <p className="text-sm text-muted-foreground">
                    Exact addresses are never exposed—only general areas to protect everyone's privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>SurplusFlow — Connecting surplus to purpose with transparency.</p>
        </div>
      </footer>
    </div>
  );
}
