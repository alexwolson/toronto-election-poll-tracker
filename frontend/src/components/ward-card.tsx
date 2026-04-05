import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WardCardProps {
  ward: {
    ward: number;
    councillor_name: string;
    is_running: boolean;
    defeatability_score: number;
  };
}

export function WardCard({ ward }: WardCardProps) {
  const classification = ward.defeatability_score >= 50 ? "competitive" 
    : ward.defeatability_score >= 30 ? "likely"
    : "safe";
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Ward {ward.ward}</CardTitle>
          <Badge variant={classification === "competitive" ? "destructive" : "outline"}>
            {classification}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-medium">{ward.councillor_name}</p>
        <p className="text-sm text-muted-foreground">
          Defeatability: {ward.defeatability_score}
        </p>
      </CardContent>
    </Card>
  );
}