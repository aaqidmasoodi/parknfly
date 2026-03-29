"use client";

import { useState, useRef } from "react";
import { useMessages, AVAILABLE_PLACEHOLDERS, MessageTemplate } from "@/lib/message-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  X,
  Eye,
  Tag,
  MessageSquare,
  Pencil,
} from "lucide-react";

interface MessageTemplateEditorProps {
  template?: MessageTemplate;
  onClose?: () => void;
  mode: "create" | "edit";
}

export function MessageTemplateEditor({
  template,
  onClose,
  mode,
}: MessageTemplateEditorProps) {
  const { addTemplate, updateTemplate, deleteTemplate } = useMessages();
  const [name, setName] = useState(template?.name || "");
  const [body, setBody] = useState(template?.body || "");
  const [imageBase64, setImageBase64] = useState<string | undefined>(
    template?.imageBase64
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = (placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + placeholder);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody =
      body.substring(0, start) + placeholder + body.substring(end);
    setBody(newBody);
    // Restore cursor position after the placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length
      );
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 1MB
    if (file.size > 1024 * 1024) {
      alert("Image must be under 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim() || !body.trim()) return;

    if (mode === "create") {
      addTemplate({ name: name.trim(), body: body.trim(), imageBase64 });
    } else if (template) {
      updateTemplate(template.id, {
        name: name.trim(),
        body: body.trim(),
        imageBase64,
      });
    }
    onClose?.();
  };

  const handleDelete = () => {
    if (template) {
      deleteTemplate(template.id);
    }
    onClose?.();
  };

  // Build a sample preview
  const previewText = body
    .replace(/\{\{name\}\}/g, "John")
    .replace(/\{\{fullName\}\}/g, "John Smith")
    .replace(/\{\{ref\}\}/g, "BK-12345")
    .replace(/\{\{vehicle\}\}/g, "Toyota Corolla")
    .replace(/\{\{reg\}\}/g, "192-D-12345")
    .replace(/\{\{terminal\}\}/g, "Terminal 1")
    .replace(/\{\{returnDate\}\}/g, "29 Mar")
    .replace(/\{\{returnTime\}\}/g, "14:30")
    .replace(/\{\{entryTime\}\}/g, "09:00")
    .replace(/\{\{entryDate\}\}/g, "22 Mar")
    .replace(/\{\{price\}\}/g, "€89.00")
    .replace(/\{\{passengers\}\}/g, "2")
    .replace(/\{\{phone\}\}/g, "087 123 4567");

  return (
    <div className="space-y-5">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="msg-name" className="text-xs font-medium flex items-center gap-1.5">
          <Tag className="h-3 w-3" />
          Template Name
        </Label>
        <Input
          id="msg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Shuttle M35" or "Check-In Confirmed"'
          className="h-9"
        />
      </div>

      {/* Body Field */}
      <div className="space-y-2">
        <Label htmlFor="msg-body" className="text-xs font-medium flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          Message Body
        </Label>
        <Textarea
          id="msg-body"
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message here. Use placeholders below to insert dynamic data."
          className="min-h-[120px] font-mono text-xs leading-relaxed resize-y"
        />

        {/* Placeholder Chips */}
        <div className="space-y-1.5">
          <p className="text-[11px] text-muted-foreground font-medium">
            Insert placeholder:
          </p>
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => insertPlaceholder(p.key)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3" />
          Attached Image
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        {imageBase64 ? (
          <div className="relative inline-block">
            <img
              src={imageBase64}
              alt="Template image"
              className="h-20 w-auto rounded-lg border object-cover"
            />
            <button
              onClick={() => setImageBase64(undefined)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/80 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="img-upload"
            />
            <label
              htmlFor="img-upload"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-accent/30 transition-colors text-xs text-muted-foreground"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Upload image (max 1MB)
            </label>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Eye className="h-3 w-3" />
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
        {showPreview && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview with sample data:
            </p>
            <div className="bg-[#dcf8c6] dark:bg-emerald-950/40 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-[300px]">
              {previewText || (
                <span className="text-muted-foreground italic">
                  Start typing to see preview…
                </span>
              )}
            </div>
            {imageBase64 && (
              <img
                src={imageBase64}
                alt="Preview"
                className="h-16 w-auto rounded-md border"
              />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        {mode === "edit" && template && (
          <Dialog open={showDelete} onOpenChange={setShowDelete}>
            <DialogTrigger
              render={
                <Button variant="ghost" size="sm" className="text-destructive gap-1.5">
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              }
            />
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete Template</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{template.name}"? This can't be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDelete(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || !body.trim()}
            className="gap-1.5"
          >
            <Save className="h-3 w-3" />
            {mode === "create" ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Message Template</DialogTitle>
          <DialogDescription>
            Create a custom message with a name and body. Use placeholders for dynamic customer data.
          </DialogDescription>
        </DialogHeader>
        <MessageTemplateEditor mode="create" onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditTemplateDialog({
  template,
}: {
  template: MessageTemplate;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit: {template.name}</DialogTitle>
          <DialogDescription>
            Modify the template name, message body, and image.
          </DialogDescription>
        </DialogHeader>
        <MessageTemplateEditor
          template={template}
          mode="edit"
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
