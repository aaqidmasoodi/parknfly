"use client";

import { useMessages } from "@/lib/message-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreateTemplateDialog,
  EditTemplateDialog,
} from "@/components/MessageTemplateEditor";
import {
  MessageSquare,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";

export function MessageTemplateList() {
  const { templates, resetToDefaults } = useMessages();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">
            Templates ({templates.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Click edit to modify any template. Use placeholders for dynamic data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Defaults
          </Button>
          <CreateTemplateDialog />
        </div>
      </div>

      {/* Template Cards */}
      {templates.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
          <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
          <p>No message templates yet.</p>
          <CreateTemplateDialog />
        </div>
      ) : (
        <div className="grid gap-2">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group hover:border-primary/20 transition-colors"
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    {template.imageBase64 ? (
                      <img
                        src={template.imageBase64}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">
                        {template.name}
                      </h4>
                      {template.imageBase64 && (
                        <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-mono leading-relaxed">
                      {template.body}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditTemplateDialog template={template} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
