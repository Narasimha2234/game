import { useAudioPlayer } from 'expo-audio';
import { useGameStore } from '../store/gameStore';

const ROLL_SOUND_SOURCE = require('../../assets/sounds/roll.wav');
const LAND_SOUND_SOURCE = require('../../assets/sounds/land.wav');

export function useGameAudio() {
  const rollPlayer = useAudioPlayer(ROLL_SOUND_SOURCE);
  const landPlayer = useAudioPlayer(LAND_SOUND_SOURCE);

  const playRoll = () => {
    const isSoundEnabled = useGameStore.getState().soundEnabled;
    if (!isSoundEnabled) return;
    try {
      if (rollPlayer) {
        rollPlayer.seekTo(0);
        rollPlayer.play();
      }
    } catch {
      // Graceful audio fallback
    }
  };

  const playLand = () => {
    const isSoundEnabled = useGameStore.getState().soundEnabled;
    if (!isSoundEnabled) return;
    try {
      if (rollPlayer) {
        rollPlayer.pause();
      }
      if (landPlayer) {
        landPlayer.seekTo(0);
        landPlayer.play();
      }
    } catch {
      // Graceful audio fallback
    }
  };

  const stopAll = () => {
    try {
      rollPlayer?.pause();
      landPlayer?.pause();
    } catch {
      // Graceful audio fallback
    }
  };

  return { playRoll, playLand, stopAll };
}
