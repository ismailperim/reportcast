import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Upload, FileText, Share2, Play, Clock, MoreVertical, Trash2, Radio } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { NavBar } from "../components/navbar";
import { useLanguage } from "../contexts/language-context";
import { useAuth } from "../contexts/auth-context";
import { api } from "../lib/api";
import { AudioPlayer } from "../components/audio-player";
import { ShareDialog } from "../components/share-dialog";

interface Report {
  id: string;
  filename: string;
  originalFilename?: string;
  title?: string;
  pageCount: number;
  tier: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl?: string;
  audioSize?: number;
  audioDurationSeconds?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  processingTimeMs?: number;
  aiCostCents?: number;
  ttsCostCents?: number;
  aiProvider?: string;
  ttsProvider?: string;
  voice?: string;
  tone?: string;
  listenCount?: number;
  lastListenedAt?: string;
}

interface UploadResponse {
  reportId: string;
  filename: string;
  pageCount: number;
  tier: string;
  priceCents: number;
  priceFormatted: string;
  creditsRequired?: number;
  creditsAvailable?: number;
  hasEnoughCredits?: boolean;
  creditDeficit?: number;
  message: string;
}

interface AIModel {
  id: string;
  modelId: string;
  provider: string;
  displayName: string;
  description: string;
  isPremium: boolean;
  isActive: boolean;
}

interface TTSVoice {
  id: string;
  voiceId: string;
  provider: string;
  displayName: string;
  description: string;
  language: string;
  gender: string;
  isPremium: boolean;
  isActive: boolean;
}

export function DashboardPage() {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  
  // Model & Voice selection
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [ttsVoices, setTtsVoices] = useState<TTSVoice[]>([]);
  const [selectedAIModel, setSelectedAIModel] = useState<string>('');
  const [selectedTTSVoice, setSelectedTTSVoice] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [selectedTone, setSelectedTone] = useState<string>('professional');

  // Filter voices based on selected language
  const filteredVoices = selectedLanguage === 'auto' 
    ? ttsVoices 
    : ttsVoices.filter(v => v.language.toLowerCase().startsWith(selectedLanguage.toLowerCase()));

  // Auto-select first voice when language changes
  useEffect(() => {
    if (filteredVoices.length > 0) {
      const currentVoiceValid = filteredVoices.some(v => v.voiceId === selectedTTSVoice);
      if (!currentVoiceValid) {
        setSelectedTTSVoice(filteredVoices[0].voiceId);
      }
    }
  }, [selectedLanguage, filteredVoices, selectedTTSVoice]);
  
  // Audio player
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<{ url: string; title: string; reportId: string } | null>(null);
  
  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Share modal
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    shareUrl: string;
    shareToken: string;
    reportTitle: string;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load reports
  useEffect(() => {
    if (user) {
      loadReports();
      loadModelsAndVoices();
    }
  }, [user]);

  // Refresh report details when modal opens
  useEffect(() => {
    if (detailOpen && selectedReport) {
      refreshReportDetails(selectedReport.id);
    }
  }, [detailOpen]);

  const refreshReportDetails = async (reportId: string) => {
    try {
      const freshReport = await api.getReport(reportId);
      
      // Update selected report with fresh data (merge all fields)
      setSelectedReport(prev => prev ? {
        ...prev,
        ...freshReport,
      } : null);

      // Also update in main list
      setReports(prev =>
        prev.map(r => r.id === reportId ? { ...r, listenCount: freshReport.listenCount } : r)
      );
    } catch (error) {
      console.error('Failed to refresh report details:', error);
    }
  };

  const loadModelsAndVoices = async () => {
    try {
      const [modelsRes, voicesRes] = await Promise.all([
        api.getAIModels(),
        api.getTTSVoices(),
      ]);
      
      setAiModels(modelsRes.models);
      setTtsVoices(voicesRes.voices);
      
      // Set defaults
      if (modelsRes.models.length > 0) {
        setSelectedAIModel(modelsRes.models[0].modelId);
      }
      if (voicesRes.voices.length > 0) {
        setSelectedTTSVoice(voicesRes.voices[0].voiceId);
      }
    } catch (error) {
      console.error('Failed to load models/voices:', error);
    }
  };

  const loadReports = async () => {
    try {
      const response = await api.getReports(20, 0);
      setReports(response.reports);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(language === 'en' ? 'Please select a file' : 'Lütfen bir dosya seçin');
      return;
    }

    setIsUploading(true);

    try {
      const response = await api.uploadReport(file);
      setUploadData(response);
      setOpen(false);
      
      // Check if user has enough credits
      if (response.hasEnoughCredits === false) {
        toast.error(response.message);
        // Show pricing page option
        setTimeout(() => {
          const goToPricing = window.confirm(
            language === 'en' 
              ? 'You need more credits. Would you like to view pricing options?' 
              : 'Daha fazla krediye ihtiyacınız var. Fiyatlandırma seçeneklerini görmek ister misiniz?'
          );
          if (goToPricing) {
            navigate('/pricing');
          }
        }, 500);
        return;
      }
      
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmProcessing = async () => {
    if (!uploadData) return;

    try {
      await api.confirmProcessing(uploadData.reportId, {
        language: selectedLanguage,
        tone: selectedTone,
        aiModel: selectedAIModel,
        ttsVoice: selectedTTSVoice,
      });

      setConfirmOpen(false);
      setFile(null);
      setUploadData(null);
      toast.success(t('dashboard.upload.success'));

      // Refresh reports
      await loadReports();

      // Poll for status updates
      pollReportStatus(uploadData.reportId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start processing');
    }
  };

  const pollReportStatus = (reportId: string) => {
    const interval = setInterval(async () => {
      try {
        const report = await api.getReport(reportId);
        
        // Update report in list
        setReports(prev =>
          prev.map(r => (r.id === reportId ? report : r))
        );

        if (report.status === 'completed') {
          clearInterval(interval);
          toast.success(language === 'en' ? 'Podcast ready!' : 'Podcast hazır!');
        } else if (report.status === 'failed') {
          clearInterval(interval);
          toast.error(language === 'en' ? 'Processing failed' : 'İşlem başarısız oldu');
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleShare = async (reportId: string) => {
    try {
      const response = await api.enableSharing(reportId);
      
      // Find report to get title
      const report = reports.find(r => r.id === reportId);
      const title = report?.title || report?.originalFilename || report?.filename || 'Podcast';
      
      // Set share data and open modal
      setShareData({
        shareUrl: response.shareUrl,
        shareToken: response.shareToken,
        reportTitle: title,
      });
      setShareDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enable sharing');
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await api.deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success(t('dashboard.delete.success'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete report');
    }
  };

  const handleContinueProcessing = async (reportId: string) => {
    try {
      // Get report details
      const report = await api.getReport(reportId);
      
      // Set upload data to open confirmation dialog
      setUploadData({
        reportId: report.id,
        filename: report.filename,
        pageCount: report.pageCount,
        tier: report.tier,
        priceCents: 0,
        priceFormatted: '$0.00',
        creditsRequired: Math.ceil(report.pageCount / 3), // Estimate
        creditsAvailable: user?.creditsRemaining || 0,
        hasEnoughCredits: true,
        message: 'Continue processing',
      });
      
      setConfirmOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load report');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; text: string }> = {
      pending: {
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        text: t('dashboard.reports.status.pending'),
      },
      processing: {
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        text: t('dashboard.reports.status.processing'),
      },
      completed: {
        className: 'bg-green-50 text-green-700 border-green-200',
        text: t('dashboard.reports.status.completed'),
      },
      failed: {
        className: 'bg-red-50 text-red-700 border-red-200',
        text: t('dashboard.reports.status.failed'),
      },
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge variant="outline" className={variant.className}>
        {variant.text}
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      {/* Page Header */}
      <div className="border-b bg-slate-50/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {language === 'en' ? 'My Reports' : 'Raporlarım'}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {language === 'en' ? 'Manage your podcast reports' : 'Podcast raporlarınızı yönetin'}
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="size-4" />
              {t('dashboard.upload.title')}
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dashboard.upload.title')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.upload.desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">{language === 'en' ? 'PDF File' : 'PDF Dosyası'}</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <Upload className="size-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm">
                    {file ? file.name : (language === 'en' ? 'Select PDF file (max 50 pages)' : 'PDF dosyası seçin (maks 50 sayfa)')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'en' ? 'Max 10MB' : 'Maksimum 10MB'}
                  </p>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {language === 'en' ? 'Cancel' : 'İptal'}
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? t('common.loading') : (language === 'en' ? 'Upload' : 'Yükle')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Processing Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dashboard.confirm.title')}</DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Configure your podcast settings' : 'Podcast ayarlarınızı yapılandırın'}
            </DialogDescription>
          </DialogHeader>
          
          {uploadData && (
            <div className="space-y-4 py-4">
              {/* File Info */}
              <div className="space-y-2 pb-3 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === 'en' ? 'Filename' : 'Dosya adı'}:</span>
                  <span className="font-medium">{uploadData.filename}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{language === 'en' ? 'Pages' : 'Sayfa'}:</span>
                  <span className="font-medium">{uploadData.pageCount}</span>
                </div>
                
                {/* AI Model Selection */}
                <div className="space-y-2 pt-3">
                  <Label htmlFor="ai-model">
                    {language === 'en' ? 'AI Model' : 'AI Modeli'}
                  </Label>
                  <select
                    id="ai-model"
                    value={selectedAIModel}
                    onChange={(e) => setSelectedAIModel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {aiModels.map((model) => (
                      <option key={model.id} value={model.modelId}>
                        {model.displayName} {model.isPremium && '👑'}
                      </option>
                    ))}
                  </select>
                  {aiModels.find(m => m.modelId === selectedAIModel)?.description && (
                    <p className="text-xs text-slate-500">
                      {aiModels.find(m => m.modelId === selectedAIModel)?.description}
                    </p>
                  )}
                </div>

                {/* Language Selection */}
                <div className="space-y-2">
                  <Label htmlFor="language">
                    {language === 'en' ? 'Language' : 'Dil'}
                  </Label>
                  <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="auto">{language === 'en' ? 'Auto-detect' : 'Otomatik algıla'}</option>
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                {/* TTS Voice Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tts-voice">
                    {language === 'en' ? 'Voice' : 'Ses'}
                    {filteredVoices.length > 0 && selectedLanguage !== 'auto' && (
                      <span className="text-xs text-slate-500 ml-2">
                        ({filteredVoices.length} {language === 'en' ? 'available' : 'mevcut'})
                      </span>
                    )}
                  </Label>
                  <select
                    id="tts-voice"
                    value={selectedTTSVoice}
                    onChange={(e) => setSelectedTTSVoice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {filteredVoices.length > 0 ? (
                      filteredVoices.map((voice) => (
                        <option key={voice.id} value={voice.voiceId}>
                          {voice.displayName} ({voice.language}) {voice.isPremium && '👑'}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {language === 'en' ? 'No voices available for this language' : 'Bu dil için ses mevcut değil'}
                      </option>
                    )}
                  </select>
                  {ttsVoices.find(v => v.voiceId === selectedTTSVoice)?.description && (
                    <p className="text-xs text-slate-500">
                      {ttsVoices.find(v => v.voiceId === selectedTTSVoice)?.description}
                    </p>
                  )}
                </div>

                {/* Tone Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tone">
                    {language === 'en' ? 'Tone' : 'Ton'}
                  </Label>
                  <select
                    id="tone"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="professional">{language === 'en' ? 'Professional' : 'Profesyonel'}</option>
                    <option value="casual">{language === 'en' ? 'Casual' : 'Günlük'}</option>
                    <option value="enthusiastic">{language === 'en' ? 'Enthusiastic' : 'Coşkulu'}</option>
                    <option value="serious">{language === 'en' ? 'Serious' : 'Ciddi'}</option>
                  </select>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="flex justify-between text-base font-semibold pt-2 border-t">
                <span>{language === 'en' ? 'Credits Required' : 'Gerekli Kredi'}:</span>
                <span className="text-indigo-600">{uploadData.creditsRequired || uploadData.tier}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('podcast.cancel')}
            </Button>
            <Button onClick={handleConfirmProcessing} className="gap-2">
              <Play className="size-4" />
              {language === 'en' ? 'Start Processing' : 'İşleme Başla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Player Dialog */}
      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Listen' : 'Dinle'}
            </DialogTitle>
            {currentAudio && (
              <DialogDescription className="truncate">
                {currentAudio.title}
              </DialogDescription>
            )}
          </DialogHeader>
          {currentAudio && (
            <AudioPlayer
              src={currentAudio.url}
              title={currentAudio.title}
              onDownload={() => {
                window.open(currentAudio.url, '_blank');
              }}
              onPlay={async () => {
                try {
                  const result = await api.trackListen(currentAudio.reportId);
                  console.log('✅ Listen tracked');
                  
                  // Update listen count in reports list
                  setReports(prev =>
                    prev.map(r => 
                      r.id === currentAudio.reportId 
                        ? { ...r, listenCount: result.listenCount }
                        : r
                    )
                  );

                  // Update selected report if detail modal is open
                  if (selectedReport && selectedReport.id === currentAudio.reportId) {
                    setSelectedReport(prev => prev ? { ...prev, listenCount: result.listenCount } : null);
                  }
                } catch (error) {
                  console.error('Failed to track listen:', error);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'en' ? 'Report Details' : 'Rapor Detayları'}</DialogTitle>
            {selectedReport && (
              <DialogDescription className="truncate">
                {selectedReport.title || selectedReport.originalFilename || selectedReport.filename}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6">
              {/* Status & Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{language === 'en' ? 'Status' : 'Durum'}</span>
                  {getStatusBadge(selectedReport.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{language === 'en' ? 'Pages' : 'Sayfa'}</span>
                  <span className="font-medium">{selectedReport.pageCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{language === 'en' ? 'Created' : 'Oluşturulma'}</span>
                  <span className="font-medium">{formatDate(selectedReport.createdAt)}</span>
                </div>
                
                {selectedReport.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{language === 'en' ? 'Completed' : 'Tamamlanma'}</span>
                    <span className="font-medium">{formatDate(selectedReport.completedAt)}</span>
                  </div>
                )}
              </div>

              {/* Audio Info */}
              {selectedReport.status === 'completed' && (
                <>
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">{language === 'en' ? 'Audio Information' : 'Ses Bilgileri'}</h4>
                    
                    {selectedReport.audioDurationSeconds && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'Duration' : 'Süre'}</span>
                        <span className="font-medium">
                          {Math.floor(selectedReport.audioDurationSeconds / 60)}:{String(selectedReport.audioDurationSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    
                    {selectedReport.audioSize && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'File Size' : 'Dosya Boyutu'}</span>
                        <span className="font-medium">
                          {(selectedReport.audioSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                    
                    {selectedReport.listenCount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'Listen Count' : 'Dinlenme Sayısı'}</span>
                        <span className="font-medium">{selectedReport.listenCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Processing Info */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">{language === 'en' ? 'Processing Details' : 'İşleme Detayları'}</h4>
                    
                    {selectedReport.processingTimeMs && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'Processing Time' : 'İşlem Süresi'}</span>
                        <span className="font-medium">{(selectedReport.processingTimeMs / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    
                    {selectedReport.aiProvider && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'AI Model' : 'AI Modeli'}</span>
                        <span className="font-medium capitalize">{selectedReport.aiProvider}</span>
                      </div>
                    )}
                    
                    {selectedReport.ttsProvider && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'TTS Provider' : 'TTS Sağlayıcı'}</span>
                        <span className="font-medium capitalize">{selectedReport.ttsProvider}</span>
                      </div>
                    )}
                    
                    {selectedReport.voice && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'Voice' : 'Ses'}</span>
                        <span className="font-medium text-xs">{selectedReport.voice}</span>
                      </div>
                    )}
                    
                    {selectedReport.tone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{language === 'en' ? 'Tone' : 'Ton'}</span>
                        <span className="font-medium capitalize">{selectedReport.tone}</span>
                      </div>
                    )}
                  </div>

                  {/* Credits Used */}
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">{language === 'en' ? 'Credits Used' : 'Kullanılan Kredi'}</h4>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{language === 'en' ? 'Pages' : 'Sayfa'}</span>
                      <span className="font-medium">{selectedReport.pageCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-t pt-2 font-semibold">
                      <span className="text-sm">{language === 'en' ? 'Total Credits' : 'Toplam Kredi'}</span>
                      <span className="text-indigo-600">{Math.ceil(selectedReport.pageCount / 3)}</span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-2">
                      {language === 'en' ? '1 credit = 3 pages' : '1 kredi = 3 sayfa'}
                    </p>
                  </div>
                </>
              )}

              {/* Error Message */}
              {selectedReport.status === 'failed' && selectedReport.errorMessage && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-red-600 mb-2">{language === 'en' ? 'Error' : 'Hata'}</h4>
                  <p className="text-sm text-slate-600 bg-red-50 p-3 rounded">
                    {selectedReport.errorMessage}
                  </p>
                </div>
              )}

              {/* Actions */}
              {selectedReport.status === 'completed' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      setCurrentAudio({
                        url: api.getDownloadUrl(selectedReport.id),
                        title: selectedReport.title || selectedReport.originalFilename?.replace('.pdf', '') || selectedReport.filename.replace('.pdf', ''),
                        reportId: selectedReport.id
                      });
                      setPlayerOpen(true);
                      setDetailOpen(false);
                    }}
                  >
                    <Play className="size-4" />
                    {language === 'en' ? 'Listen' : 'Dinle'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => handleShare(selectedReport.id)}
                  >
                    <Share2 className="size-4" />
                    {language === 'en' ? 'Share' : 'Paylaş'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      {shareData && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          shareUrl={shareData.shareUrl}
          shareToken={shareData.shareToken}
          reportTitle={shareData.reportTitle}
        />
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{language === 'en' ? 'Total Podcasts' : 'Toplam Podcast'}</CardDescription>
              <CardTitle className="text-3xl">{reports.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{language === 'en' ? 'Completed' : 'Tamamlanan'}</CardDescription>
              <CardTitle className="text-3xl">
                {reports.filter(r => r.status === 'completed').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{language === 'en' ? 'Processing' : 'İşleniyor'}</CardDescription>
              <CardTitle className="text-3xl">
                {reports.filter(r => r.status === 'processing').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Podcasts List */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'en' ? 'My Podcasts' : 'Podcast\'lerim'}</CardTitle>
            <CardDescription>
              {language === 'en' ? 'All your created podcasts' : 'Oluşturduğunuz tüm podcast\'ler'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <p>{t('common.loading')}</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="size-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">
                  {language === 'en' ? 'You haven\'t created any podcasts yet' : 'Henüz podcast oluşturmadınız'}
                </p>
                <Button onClick={() => setOpen(true)}>
                  {language === 'en' ? 'Upload Your First Report' : 'İlk Raporunuzu Yükleyin'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="size-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <Radio className="size-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{report.title || report.originalFilename || report.filename}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDate(report.createdAt)}
                          </span>
                          <span>{report.pageCount} {language === 'en' ? 'pages' : 'sayfa'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(report.status)}
                      
                      {report.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleContinueProcessing(report.id)}
                        >
                          <Upload className="size-4" />
                          {language === 'en' ? 'Continue' : 'Devam Et'}
                        </Button>
                      )}
                      
                      {report.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-orange-600"
                          onClick={() => handleContinueProcessing(report.id)}
                        >
                          <Upload className="size-4" />
                          {language === 'en' ? 'Retry' : 'Tekrar Dene'}
                        </Button>
                      )}
                      
                      {report.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              setCurrentAudio({
                                url: api.getDownloadUrl(report.id),
                                title: report.title || report.originalFilename?.replace('.pdf', '') || report.filename.replace('.pdf', ''),
                                reportId: report.id
                              });
                              setPlayerOpen(true);
                            }}
                          >
                            <Play className="size-4" />
                            {t('dashboard.reports.listen')}
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => handleShare(report.id)}
                          >
                            <Share2 className="size-4" />
                            {language === 'en' ? 'Share' : 'Paylaş'}
                          </Button>
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReport(report);
                              setDetailOpen(true);
                            }}
                          >
                            <FileText className="size-4 mr-2" />
                            {language === 'en' ? 'Details' : 'Detaylar'}
                          </DropdownMenuItem>
                          
                          {report.status === 'completed' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setCurrentAudio({
                                    url: api.getDownloadUrl(report.id),
                                    title: report.title || report.originalFilename?.replace('.pdf', '') || report.filename.replace('.pdf', ''),
                                    reportId: report.id
                                  });
                                  setPlayerOpen(true);
                                }}
                              >
                                <Play className="size-4 mr-2" />
                                {language === 'en' ? 'Listen' : 'Dinle'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(report.id)}>
                                <Share2 className="size-4 mr-2" />
                                {language === 'en' ? 'Share' : 'Paylaş'}
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {report.status === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleContinueProcessing(report.id)}
                            >
                              <Upload className="size-4 mr-2" />
                              {language === 'en' ? 'Continue Processing' : 'İşleme Devam Et'}
                            </DropdownMenuItem>
                          )}
                          
                          {report.status === 'failed' && report.errorMessage && (
                            <DropdownMenuItem
                              onClick={() => {
                                toast.error(report.errorMessage || 'Unknown error');
                              }}
                            >
                              <FileText className="size-4 mr-2" />
                              {language === 'en' ? 'Show Error' : 'Hatayı Göster'}
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(report.id)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            {language === 'en' ? 'Delete' : 'Sil'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}