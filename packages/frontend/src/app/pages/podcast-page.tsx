import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Copy, CheckCircle, Calendar, Headphones, FileText, Radio, Clock } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { NavBar } from "../components/navbar";
import { useLanguage } from "../contexts/language-context";
import { api } from "../lib/api";

interface PodcastData {
  id: string;
  title: string;
  description: string;
  duration: number;
  createdAt: string;
  audioUrl: string;
  pageCount?: number;
  listenCount?: number;
  extractedText?: string;
}

interface TranscriptParagraph {
  text: string;
  startTime: number;
  endTime: number;
}

// Parse transcript into timed paragraphs with character-based timing
function parseTranscriptWithTiming(text: string, totalDuration: number): TranscriptParagraph[] {
  if (!text || !totalDuration) return [];
  
  // Split by double newline or single newline (paragraphs)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  if (paragraphs.length === 0) return [];
  
  // Calculate time per character (more accurate than per paragraph)
  const totalChars = paragraphs.reduce((sum, p) => sum + p.trim().length, 0);
  const timePerChar = totalDuration / totalChars;
  
  let currentTime = 0;
  
  return paragraphs.map((para) => {
    const trimmedPara = para.trim();
    const paraChars = trimmedPara.length;
    const paraDuration = paraChars * timePerChar;
    
    const result: TranscriptParagraph = {
      text: trimmedPara,
      startTime: currentTime,
      endTime: currentTime + paraDuration
    };
    
    currentTime += paraDuration;
    return result;
  });
}

export function PodcastPage() {
  const { shareToken } = useParams();
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [transcriptParagraphs, setTranscriptParagraphs] = useState<TranscriptParagraph[]>([]);
  const [activeParaIndex, setActiveParaIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    const loadMetadata = async () => {
      try {
        const metadata = await api.getPublicMetadata(shareToken);
        const audioUrl = api.getListenUrl(shareToken);
        
        setPodcast({
          id: metadata.id,
          title: metadata.title,
          description: language === 'en' 
            ? `${metadata.pageCount} page report`
            : `${metadata.pageCount} sayfa rapor`,
          duration: metadata.audioDurationSeconds || 0,
          createdAt: metadata.createdAt,
          audioUrl: audioUrl,
          pageCount: metadata.pageCount,
          listenCount: metadata.listenCount,
          extractedText: metadata.generatedScript || metadata.extractedText, // Prefer AI-generated script over raw text
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load metadata:', error);
        setError(language === 'en' ? 'Podcast not found' : 'Podcast bulunamadı');
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [shareToken, language]);

  // Parse transcript when podcast loads
  useEffect(() => {
    if (podcast?.extractedText && duration > 0) {
      const paragraphs = parseTranscriptWithTiming(podcast.extractedText, duration);
      setTranscriptParagraphs(paragraphs);
      console.log(`📝 Parsed ${paragraphs.length} paragraphs for ${duration.toFixed(1)}s audio`);
      console.log('First para:', paragraphs[0]?.startTime.toFixed(1), '-', paragraphs[0]?.endTime.toFixed(1));
    }
  }, [podcast?.extractedText, duration]);

  // Update active paragraph based on current time
  useEffect(() => {
    if (transcriptParagraphs.length === 0 || !isPlaying) return;
    
    // Find active paragraph with slight look-ahead tolerance (0.5s)
    const lookAhead = 0.5;
    const activeIndex = transcriptParagraphs.findIndex(
      para => currentTime >= para.startTime - lookAhead && currentTime < para.endTime + lookAhead
    );
    
    if (activeIndex !== -1 && activeIndex !== activeParaIndex) {
      setActiveParaIndex(activeIndex);
      
      // Auto-scroll to active paragraph (only when playing)
      if (transcriptRef.current && isPlaying) {
        const activeElement = transcriptRef.current.querySelector(`[data-para-index="${activeIndex}"]`);
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [currentTime, transcriptParagraphs, activeParaIndex, isPlaying]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log('Audio metadata loaded, duration:', audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    console.log('Audio event listeners attached');

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      console.log('Audio event listeners removed');
    };
  }, [podcast]); // Re-attach when podcast changes!

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      
      setCopied(true);
      toast.success(language === 'en' ? 'Link copied!' : 'Link kopyalandı!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(language === 'en' ? 'Failed to copy' : 'Kopyalama başarısız');
    }
  };

  const handleDownload = () => {
    if (!podcast) return;
    window.open(podcast.audioUrl, '_blank');
    toast.success(language === 'en' ? 'Download started!' : 'İndirme başlatıldı!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
            <Radio className="size-8 text-indigo-600" />
          </div>
          <p className="text-gray-600">{language === 'en' ? 'Loading...' : 'Yükleniyor...'}</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Not Found' : 'Bulunamadı'}</CardTitle>
            <CardDescription>
              {error || (language === 'en' ? 'Podcast not found' : 'Podcast bulunamadı')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default">
              <Link to="/">{language === 'en' ? 'Go Home' : 'Ana Sayfaya Dön'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Audio element */}
      <audio ref={audioRef} src={podcast.audioUrl} preload="metadata" />

      <NavBar 
        transparent 
        extraActions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              className="gap-2"
            >
              {copied ? (
                <CheckCircle className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="hidden sm:inline">
                {language === 'en' ? 'Copy' : 'Kopyala'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">
                {language === 'en' ? 'Download' : 'İndir'}
              </span>
            </Button>
          </>
        }
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Player Card */}
        <Card className="shadow-xl border border-gray-200 bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="text-center pb-8 space-y-6">
            {/* Album Art */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="size-40 rounded-3xl bg-gradient-to-br from-indigo-100 via-purple-50 to-slate-100 border-2 border-indigo-200 flex items-center justify-center shadow-xl">
                  <Radio className="size-20 text-indigo-600" />
                </div>
                {isPlaying && (
                  <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-pulse" />
                )}
                <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                  {isPlaying ? (
                    <Pause className="size-4 text-white" />
                  ) : (
                    <Play className="size-4 ml-0.5 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent line-clamp-2">
                {podcast.title}
              </CardTitle>
              {podcast.description && (
                <CardDescription className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {podcast.description}
                </CardDescription>
              )}
            </div>

            {/* Meta Badges */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {podcast.listenCount !== undefined && (
                <Badge variant="outline" className="gap-1.5 border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-1">
                  <Headphones className="size-4" />
                  {podcast.listenCount} {language === 'en' ? 'listens' : 'dinlenme'}
                </Badge>
              )}
              {podcast.pageCount && (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 px-3 py-1">
                  <FileText className="size-4 mr-1" />
                  {podcast.pageCount} {language === 'en' ? 'pages' : 'sayfa'}
                </Badge>
              )}
              {duration > 0 && (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 px-3 py-1">
                  <Clock className="size-4 mr-1" />
                  {formatTime(duration)}
                </Badge>
              )}
              <Badge variant="outline" className="gap-1.5 border-slate-200 bg-slate-50 text-slate-700 px-3 py-1">
                <Calendar className="size-4" />
                {new Date(podcast.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pb-10">
            {/* Progress Bar */}
            <div className="space-y-3">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSliderChange}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span className="tabular-nums">{formatTime(currentTime)}</span>
                <span className="tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <Button
                size="lg"
                variant="outline"
                className="size-16 rounded-full p-0 border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all"
                onClick={skipBackward}
              >
                <SkipBack className="size-6 text-slate-700" />
              </Button>
              
              <Button
                size="lg"
                className="size-24 rounded-full p-0 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="size-10 text-white" />
                ) : (
                  <Play className="size-10 ml-1 text-white" />
                )}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="size-16 rounded-full p-0 border-2 border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all"
                onClick={skipForward}
              >
                <SkipForward className="size-6 text-slate-700" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 max-w-xs mx-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleMute}
                className="shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-5 text-gray-500" />
                ) : (
                  <Volume2 className="size-5 text-gray-500" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="flex-1"
              />
              <span className="text-sm text-gray-500 w-10 text-right">{isMuted ? 0 : volume}%</span>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                {language === 'en' 
                  ? 'Keyboard: Space = Play/Pause, ← → = Skip 15s, M = Mute'
                  : 'Klavye: Boşluk = Oynat/Duraklat, ← → = 15s atla, M = Sessiz'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Transcript with Sync Highlight */}
        {transcriptParagraphs.length > 0 && (
          <Card className="mt-8 border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="size-5 text-indigo-600" />
                {language === 'en' ? 'Transcript' : 'Transkript'}
                {isPlaying && (
                  <Badge variant="outline" className="ml-auto text-xs border-indigo-200 text-indigo-700">
                    <Radio className="size-3 mr-1 animate-pulse" />
                    {language === 'en' ? 'Live sync' : 'Canlı senkron'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {language === 'en' 
                  ? 'Follow along as the audio plays' 
                  : 'Ses oynatılırken takip edin'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={transcriptRef}
                className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {transcriptParagraphs.map((para, index) => (
                  <p
                    key={index}
                    data-para-index={index}
                    className={`
                      leading-relaxed transition-all duration-300 p-3 rounded-lg cursor-pointer
                      ${index === activeParaIndex 
                        ? 'bg-indigo-50 text-gray-900 font-medium border-l-4 border-indigo-600 pl-4 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50'
                      }
                    `}
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = para.startTime;
                      }
                    }}
                  >
                    {para.text}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            {language === 'en' 
              ? 'Transform your reports into podcasts with ReportCast'
              : 'ReportCast ile raporlarınızı podcast\'e dönüştürün'
            }
          </p>
          <Link to="/">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md">
              <Radio className="size-4" />
              {language === 'en' ? 'Try ReportCast' : 'ReportCast\'i Dene'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>
            {language === 'en' ? 'Powered by' : 'Tarafından desteklenmektedir'}{' '}
            <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700">
              ReportCast
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
