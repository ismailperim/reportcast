import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Radio, Play, Pause, SkipBack, SkipForward, Volume2, Share2, Download } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { LanguageSwitcher } from "../components/language-switcher";
import { useLanguage } from "../contexts/language-context";
import { api } from "../lib/api";

interface PodcastData {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  createdAt: string;
  audioUrl: string;
}

export function PodcastPage() {
  const { shareId } = useParams();
  const { t, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!shareId) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    // Load podcast data - the shareId can be used to construct the listen URL
    // Since this is a public endpoint, we don't need authentication
    const audioUrl = api.getListenUrl(shareId);
    
    // Create mock podcast data - in a real scenario, you might fetch metadata
    // from a separate endpoint or embed it in the audio file
    setPodcast({
      id: shareId,
      title: language === 'en' ? 'Report Podcast' : 'Rapor Podcast',
      description: language === 'en' 
        ? 'Listen to this report as a podcast'
        : 'Bu raporu podcast olarak dinleyin',
      duration: 0, // Will be set when audio loads
      createdAt: new Date().toISOString(),
      audioUrl: audioUrl,
    });
    
    setIsLoading(false);
  }, [shareId, language]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

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

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success(t('dashboard.copy.success'));
  };

  const handleDownload = () => {
    if (!podcast) return;
    window.open(podcast.audioUrl, '_blank');
    toast.success(language === 'en' ? 'Download started!' : 'İndirme başlatıldı!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <p className="text-slate-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Error' : 'Hata'}</CardTitle>
            <CardDescription>
              {error || (language === 'en' ? 'Podcast not found' : 'Podcast bulunamadı')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">{language === 'en' ? 'Go Home' : 'Ana Sayfaya Dön'}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Audio element */}
      <audio ref={audioRef} src={podcast.audioUrl} preload="metadata" />

      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Radio className="size-6 text-indigo-600" />
            <span className="font-semibold text-xl">ReportCast</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="size-4" />
              {language === 'en' ? 'Share' : 'Paylaş'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="size-4" />
              {language === 'en' ? 'Download' : 'İndir'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Player Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="size-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Radio className="size-16 text-white" />
            </div>
            <CardTitle className="text-2xl mb-2">{podcast.title}</CardTitle>
            <CardDescription className="text-base">{podcast.description}</CardDescription>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge variant="outline">
                {new Date(podcast.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
              <Badge variant="outline">{formatTime(duration)}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration}
                step={1}
                onValueChange={handleSliderChange}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                className="size-12 rounded-full p-0"
                onClick={skipBackward}
              >
                <SkipBack className="size-5" />
              </Button>
              
              <Button
                size="lg"
                className="size-16 rounded-full p-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="size-7" />
                ) : (
                  <Play className="size-7 ml-1" />
                )}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="size-12 rounded-full p-0"
                onClick={skipForward}
              >
                <SkipForward className="size-5" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 max-w-xs mx-auto">
              <Volume2 className="size-5 text-slate-500" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="flex-1"
              />
              <span className="text-sm text-slate-500 w-10 text-right">{volume}%</span>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 mb-4">
            {language === 'en' 
              ? 'Transform your own reports into podcasts with ReportCast'
              : 'ReportCast ile kendi raporlarınızı podcast\'e dönüştürün'
            }
          </p>
          <Link to="/">
            <Button className="gap-2">
              <Radio className="size-4" />
              {language === 'en' ? 'Discover ReportCast' : 'ReportCast\'i Keşfet'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-slate-50 mt-12">
        <div className="container mx-auto px-4 py-8 text-center text-slate-600">
          <p>Powered by <span className="font-semibold text-indigo-600">ReportCast</span></p>
        </div>
      </footer>
    </div>
  );
}