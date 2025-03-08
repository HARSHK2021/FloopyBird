import { useCallback, useEffect, useRef, useState } from 'react';

interface Bird {
  y: number;
  velocity: number;
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const BIRD_SIZE = 30;
const PIPE_WIDTH = 60;
const PIPE_GAP = 170;
const PIPE_SPEED = 2.5;

// More reliable audio sources
const AUDIO_SOURCES = {
  jump: 'https://raw.githubusercontent.com/soundkit/flappy-bird-sounds/master/sfx_wing.mp3',
  score: 'https://raw.githubusercontent.com/soundkit/flappy-bird-sounds/master/sfx_point.mp3',
  hit: 'https://raw.githubusercontent.com/soundkit/flappy-bird-sounds/master/sfx_hit.mp3',
  bgm: 'https://raw.githubusercontent.com/soundkit/flappy-bird-sounds/master/bgm.mp3'
};

const useGameLogic = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const birdRef = useRef<Bird>({ y: 300, velocity: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const animationFrameRef = useRef<number>();
  const lastPipeSpawnRef = useRef(0);
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Initialize audio with error handling
    Object.entries(AUDIO_SOURCES).forEach(([key, src]) => {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      if (key === 'bgm') {
        audio.loop = true;
        audio.volume = 0.5;
      }
      audioRef.current[key] = audio;
    });

    return () => {
      Object.values(audioRef.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const playSound = (type: keyof typeof AUDIO_SOURCES) => {
    if (!isMuted && audioRef.current[type]) {
      try {
        const audio = audioRef.current[type];
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      } catch (error) {
        // Silently handle any audio playback errors
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        audioRef.current.bgm?.pause();
      } else {
        audioRef.current.bgm?.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
      return newMuted;
    });
  };

  const generatePipe = () => {
    const minHeight = 100;
    const maxHeight = canvasRef.current!.height - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    return {
      x: canvasRef.current!.width,
      topHeight,
      passed: false,
    };
  };

  const checkCollision = (bird: Bird, pipe: Pipe): boolean => {
    const birdBox = {
      top: bird.y + 5,
      bottom: bird.y + BIRD_SIZE - 5,
      left: 50 + 5,
      right: 50 + BIRD_SIZE - 5,
    };

    const topPipeBox = {
      top: 0,
      bottom: pipe.topHeight,
      left: pipe.x,
      right: pipe.x + PIPE_WIDTH,
    };

    const bottomPipeBox = {
      top: pipe.topHeight + PIPE_GAP,
      bottom: canvasRef.current!.height,
      left: pipe.x,
      right: pipe.x + PIPE_WIDTH,
    };

    const collidesWithPipe = (box: typeof birdBox, pipeBox: typeof topPipeBox) => {
      return !(
        box.right < pipeBox.left ||
        box.left > pipeBox.right ||
        box.bottom < pipeBox.top ||
        box.top > pipeBox.bottom
      );
    };

    return (
      collidesWithPipe(birdBox, topPipeBox) ||
      collidesWithPipe(birdBox, bottomPipeBox) ||
      bird.y <= 0 ||
      bird.y + BIRD_SIZE >= canvasRef.current!.height
    );
  };

  const drawBird = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(50 + BIRD_SIZE/2, birdRef.current.y + BIRD_SIZE/2);
    ctx.rotate(birdRef.current.rotation);

    // Bird body
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_SIZE/2, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-5, 0, BIRD_SIZE/4, BIRD_SIZE/3, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(10, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, -2);
    ctx.lineTo(20, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const gameLoop = useCallback(() => {
    if (!canvasRef.current || gameState !== 'playing') return;

    const ctx = canvasRef.current.getContext('2d')!;
    const canvas = canvasRef.current;

    // Update bird
    birdRef.current.velocity += GRAVITY;
    birdRef.current.y += birdRef.current.velocity;
    
    // Update bird rotation based on velocity
    const targetRotation = birdRef.current.velocity * 0.04;
    birdRef.current.rotation += (targetRotation - birdRef.current.rotation) * 0.1;

    // Update pipes
    const now = Date.now();
    if (now - lastPipeSpawnRef.current > 1800) {
      pipesRef.current.push(generatePipe());
      lastPipeSpawnRef.current = now;
    }

    pipesRef.current = pipesRef.current.filter(pipe => pipe.x > -PIPE_WIDTH);
    pipesRef.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
      
      if (!pipe.passed && pipe.x + PIPE_WIDTH < 50) {
        pipe.passed = true;
        setScore(prev => prev + 1);
        playSound('score');
      }
    });

    if (pipesRef.current.some(pipe => checkCollision(birdRef.current, pipe))) {
      playSound('hit');
      setGameState('gameOver');
      setHighScore(prev => Math.max(prev, score));
      return;
    }

    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bird
    drawBird(ctx);

    // Draw pipes with gradient
    pipesRef.current.forEach(pipe => {
      const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGradient.addColorStop(0, '#2ECC71');
      pipeGradient.addColorStop(0.5, '#27AE60');
      pipeGradient.addColorStop(1, '#2ECC71');
      ctx.fillStyle = pipeGradient;

      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(
        pipe.x,
        pipe.topHeight + PIPE_GAP,
        PIPE_WIDTH,
        canvas.height - (pipe.topHeight + PIPE_GAP)
      );

      // Pipe caps
      ctx.fillStyle = '#27AE60';
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
      ctx.fillRect(pipe.x - 5, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 10, 20);
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  const startGame = () => {
    birdRef.current = { y: 300, velocity: 0, rotation: 0 };
    pipesRef.current = [];
    lastPipeSpawnRef.current = Date.now();
    setScore(0);
    setGameState('playing');
    if (!isMuted) {
      audioRef.current.bgm?.play().catch(() => {
        // Silently handle autoplay restrictions
      });
    }
  };

  const handleClick = () => {
    if (gameState === 'playing') {
      birdRef.current.velocity = JUMP_FORCE;
      playSound('jump');
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      handleClick();
    }
  };

  return {
    gameState,
    score,
    highScore,
    startGame,
    handleClick,
    handleKeyPress,
    toggleMute,
    isMuted
  };
};

export default useGameLogic;