import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Radio, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Share2, Download, Copy, CheckCircle, Headphones } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { LanguageSwitcher } from "../components/language-switcher";
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
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <Radio className="size-8 text-white" />
          </div>
          <p className="text-white text-lg">{language === 'en' ? 'Loading...' : 'Yükleniyor...'}</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="pt-6 text-center">
            <div className="size-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Radio className="size-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {language === 'en' ? 'Not Found' : 'Bulunamadı'}
            </h2>
            <p className="text-white/60 mb-6">
              {error || (language === 'en' ? 'Podcast not found' : 'Podcast bulunamadı')}
            </p>
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link to="/">{language === 'en' ? 'Go Home' : 'Ana Sayfaya Dön'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 size-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Audio element */}
      <audio ref={audioRef} src={podcast.audioUrl} preload="metadata" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
            <Radio className="size-6" />
            <span className="font-semibold text-xl">ReportCast</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              className="text-white hover:bg-white/10 gap-2"
            >
              {copied ? (
                <CheckCircle className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="hidden sm:inline">
                {language === 'en' ? 'Copy Link' : 'Linki Kopyala'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="text-white hover:bg-white/10 gap-2"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">
                {language === 'en' ? 'Download' : 'İndir'}
              </span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        {/* Player Card */}
        <Card className="shadow-2xl bg-white/95 backdrop-blur-md border-0">
          <CardContent className="p-8 md:p-12">
            {/* Album Art */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="size-48 md:size-64 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                  <Radio className="size-24 md:size-32 text-white drop-shadow-lg" />
                </div>
                {isPlaying && (
                  <div className="absolute inset-0 rounded-3xl bg-white/20 animate-pulse" />
                )}
              </div>
            </div>

            {/* Title & Info */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3 line-clamp-2">
                {podcast.title}
              </h1>
              <p className="text-slate-600 mb-4">{podcast.description}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  <Headphones className="size-3.5" />
                  {podcast.listenCount || 0} {language === 'en' ? 'listens' : 'dinlenme'}
                </Badge>
                <Badge variant="outline">
                  {formatTime(duration)}
                </Badge>
                <Badge variant="outline">
                  {new Date(podcast.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-8">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSliderChange}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                size="lg"
                variant="ghost"
                className="size-14 rounded-full p-0 hover:bg-slate-100"
                onClick={skipBackward}
              >
                <SkipBack className="size-6" />
              </Button>
              
              <Button
                size="lg"
                className="size-20 rounded-full p-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="size-9" />
                ) : (
                  <Play className="size-9 ml-1" />
                )}
              </Button>
              
              <Button
                size="lg"
                variant="ghost"
                className="size-14 rounded-full p-0 hover:bg-slate-100"
                onClick={skipForward}
              >
                <SkipForward className="size-6" />
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
                  <VolumeX className="size-5 text-slate-500" />
                ) : (
                  <Volume2 className="size-5 text-slate-500" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="flex-1"
              />
              <span className="text-sm text-slate-500 w-10 text-right">{isMuted ? 0 : volume}%</span>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-xs text-center text-slate-500">
                {language === 'en' 
                  ? 'Keyboard shortcuts: Space = Play/Pause, ← → = Skip 15s, M = Mute'
                  : 'Klavye kısayolları: Boşluk = Oynat/Duraklat, ← → = 15s atla, M = Sessiz'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-white/90 mb-4 drop-shadow-md">
            {language === 'en' 
              ? 'Transform your reports into podcasts with ReportCast'
              : 'ReportCast ile raporlarınızı podcast\'e dönüştürün'
            }
          </p>
          <Link to="/">
            <Button className="gap-2 bg-white text-indigo-600 hover:bg-white/90 shadow-lg">
              <Radio className="size-4" />
              {language === 'en' ? 'Try ReportCast' : 'ReportCast\'i Dene'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-white/80 text-sm">
          <p>Powered by <span className="font-semibold text-white">ReportCast</span></p>
        </div>
      </footer>
    </div>
  );
}
