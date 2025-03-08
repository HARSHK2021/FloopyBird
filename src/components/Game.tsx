import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import useGameLogic from '../hooks/useGameLogic';

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const {
    gameState,
    score,
    highScore,
    startGame,
    handleClick,
    handleKeyPress,
    toggleMute
  } = useGameLogic(canvasRef);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-200 flex flex-col items-center justify-center p-4">
      <div className="relative border-8 border-amber-600 rounded-lg shadow-2xl">
        <canvas
          ref={canvasRef}
          width={400}
          height={600}
          className="bg-gradient-to-b from-sky-300 to-sky-400 rounded-lg cursor-pointer"
          onClick={handleClick}
        />
        
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <h1 className="text-4xl font-bold text-white mb-4 text-shadow">Flappy Bird</h1>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transform hover:scale-105 transition shadow-lg"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <h2 className="text-3xl font-bold text-white mb-2 text-shadow">Game Over!</h2>
            <p className="text-xl text-white mb-4">Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transform hover:scale-105 transition shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}

        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 p-2 bg-white bg-opacity-50 rounded-full hover:bg-opacity-75 transition"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-gray-800" />
          ) : (
            <Volume2 className="w-6 h-6 text-gray-800" />
          )}
        </button>

        <div className="absolute top-4 left-4 bg-white bg-opacity-50 px-4 py-2 rounded-full">
          <p className="text-xl font-bold">Score: {score}</p>
          <p className="text-sm">High Score: {highScore}</p>
        </div>
      </div>
    </div>
  );
};

export default Game;