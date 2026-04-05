import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ward } from "@/types/ward";

const COMPETITIVE_THRESHOLD = 50;
const LIKELY_THRESHOLD = 30;

interface WardCardProps {
  ward: Ward;
}

export function WardCard({ ward }: WardCardProps) {
  const classification = ward.defeatability_score >= COMPETITIVE_THRESHOLD ? "competitive" 
    : ward.defeatability_score >= LIKELY_THRESHOLD ? "likely"
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