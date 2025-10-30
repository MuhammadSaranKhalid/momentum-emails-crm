import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Eye, Save, Send, Pencil, Check, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onSendCampaign: () => void;
  isSaving?: boolean;
  isSending?: boolean;
}

export function Header({ 
  campaignName,
  onCampaignNameChange,
  onPreview, 
  onSaveDraft, 
  onSendCampaign,
  isSaving = false,
  isSending = false
}: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(campaignName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setTempName(campaignName);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempName.trim()) {
      onCampaignNameChange(tempName.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempName(campaignName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6 py-3">
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter campaign name..."
              className="text-lg font-semibold px-3 h-9 max-w-md"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-600/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">
              {campaignName}
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={isSaving || isSending}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={isSaving || isSending}
        >
          {isSaving ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Draft"}
        </Button>
        <Button 
          type="button"
          onClick={onSendCampaign}
          disabled={isSaving || isSending}
        >
          {isSending ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isSending ? "Sending..." : "Send Campaign"}
        </Button>
      </div>
    </header>
  );
}
