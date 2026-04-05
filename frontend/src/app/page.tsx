import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2">Toronto 2026 Elections</h1>
        <p className="text-muted-foreground mb-8">
          Ward-by-ward council race projections and mayoral polling
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Council Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Projected incumbent wins</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Of 25 wards</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Mayoral Race</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading polling data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}