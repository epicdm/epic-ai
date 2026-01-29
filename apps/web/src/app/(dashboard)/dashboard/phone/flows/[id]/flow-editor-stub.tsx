"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FlowEditorStubProps {
  flowId: string;
}

export function FlowEditorStub({ flowId }: FlowEditorStubProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/phone/flows">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Flows
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flow Editor</CardTitle>
          <CardDescription>
            Flow ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{flowId}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The visual flow editor will be available here. This page is a
            placeholder that will be replaced with the full conversation flow
            builder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
