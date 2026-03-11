import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Copy, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../contexts/language-context";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  shareToken: string;
  reportTitle: string;
}

export function ShareDialog({ open, onOpenChange, shareUrl, shareToken, reportTitle }: ShareDialogProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for HTTP contexts
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      
      setCopied(true);
      toast.success(language === 'en' ? 'Link copied!' : 'Link kopyalandı!');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error(language === 'en' ? 'Failed to copy' : 'Kopyalama başarısız');
    }
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Share Podcast' : 'Podcast Paylaş'}
          </DialogTitle>
          <DialogDescription className="truncate">
            {reportTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Share Token */}
          <div className="space-y-2">
            <Label htmlFor="token" className="text-sm text-slate-600">
              {language === 'en' ? 'Share Token' : 'Paylaşım Token'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="token"
                value={shareToken}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(shareToken);
                  toast.success(language === 'en' ? 'Token copied!' : 'Token kopyalandı!');
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm text-slate-600">
              {language === 'en' ? 'Public Link' : 'Genel Link'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Future: Public/Private Toggle */}
          {/* <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <Label className="text-sm font-medium">
                {language === 'en' ? 'Public Access' : 'Genel Erişim'}
              </Label>
              <p className="text-xs text-slate-500">
                {language === 'en' 
                  ? 'Anyone with the link can listen' 
                  : 'Link ile herkes dinleyebilir'}
              </p>
            </div>
            <Switch checked={true} onCheckedChange={() => {}} />
          </div> */}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleOpenLink}
            >
              <ExternalLink className="size-4" />
              {language === 'en' ? 'Open Link' : 'Linki Aç'}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleCopy}
            >
              <Copy className="size-4" />
              {language === 'en' ? 'Copy Link' : 'Linki Kopyala'}
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 text-center pt-2">
            {language === 'en'
              ? 'Share this link to let others listen to your podcast'
              : 'Bu linki paylaşarak podcast\'inizin başkaları tarafından dinlenmesini sağlayın'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
