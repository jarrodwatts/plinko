import { useEffect, useRef, useState } from 'react';

interface AudioState {
  isLoaded: boolean;
  isMuted: boolean;
  error: string | null;
}

interface AudioHook {
  playBallDrop: () => void;
  playBounce: () => void;
  playLand: () => void;
  playBigWin: () => void;
  toggleMute: () => void;
  isLoaded: boolean;
  isMuted: boolean;
  error: string | null;
}

const SOUND_PATHS = {
  play: '/sounds/play.ogg',
  bounce: '/sounds/bounce.ogg',
  land: '/sounds/land.ogg',
  big_win: '/sounds/big_win.ogg',
} as const;

export const useAudio = (): AudioHook => {
  const audioRefs = useRef<Record<keyof typeof SOUND_PATHS, HTMLAudioElement | null>>({
    play: null,
    bounce: null,
    land: null,
    big_win: null,
  });

  const bouncePoolRef = useRef<HTMLAudioElement[]>([]);
  const [state, setState] = useState<AudioState>({
    isLoaded: false,
    isMuted: false,
    error: null,
  });

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const audioPromises = Object.entries(SOUND_PATHS).map(async ([key, path]) => {
          const audio = new Audio(path);
          audio.preload = 'auto';
          audio.volume = 0.7;
          
          return new Promise<void>((resolve, reject) => {
            const handleLoad = () => {
              audio.removeEventListener('canplaythrough', handleLoad);
              audio.removeEventListener('error', handleError);
              audioRefs.current[key as keyof typeof SOUND_PATHS] = audio;
              resolve();
            };

            const handleError = () => {
              audio.removeEventListener('canplaythrough', handleLoad);
              audio.removeEventListener('error', handleError);
              reject(new Error(`Failed to load ${path}`));
            };

            audio.addEventListener('canplaythrough', handleLoad);
            audio.addEventListener('error', handleError);
            audio.load();
          });
        });

        await Promise.all(audioPromises);

        for (let i = 0; i < 5; i++) {
          const bounceAudio = new Audio(SOUND_PATHS.bounce);
          bounceAudio.preload = 'auto';
          bounceAudio.volume = 0.5;
          bouncePoolRef.current.push(bounceAudio);
        }

        setState(prev => ({ ...prev, isLoaded: true, error: null }));
      } catch (error) {
        console.error('Failed to load audio files:', error);
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to load audio files'
        }));
      }
    };

    loadAudio();
  }, []);

  const playSound = (audioRef: HTMLAudioElement | null, volume = 0.7) => {
    if (!audioRef || state.isMuted) return;

    try {
      audioRef.currentTime = 0;
      audioRef.volume = volume;
      const playPromise = audioRef.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Audio play failed:', error);
        });
      }
    } catch (error) {
      console.warn('Audio play error:', error);
    }
  };

  const playBallDrop = () => {
    playSound(audioRefs.current.play, 0.8);
  };

  const playBounce = () => {
    const availableBounce = bouncePoolRef.current.find(audio => 
      audio.paused || audio.ended || audio.currentTime === 0
    );
    
    if (availableBounce) {
      playSound(availableBounce, 0.3);
    } else {
      playSound(audioRefs.current.bounce, 0.3);
    }
  };

  const playLand = () => {
    playSound(audioRefs.current.land, 0.6);
  };

  const playBigWin = () => {
    playSound(audioRefs.current.big_win, 0.9);
  };

  const toggleMute = () => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  return {
    playBallDrop,
    playBounce,
    playLand,
    playBigWin,
    toggleMute,
    isLoaded: state.isLoaded,
    isMuted: state.isMuted,
    error: state.error,
  };
};