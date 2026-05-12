import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden" aria-label={title}>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle style={{ fontFamily: "var(--font-display)" }}>{title}</CardTitle>
          {subtitle ? <CardDescription className="mt-2">{subtitle}</CardDescription> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
