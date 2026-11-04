import { toast } from 'sonner@2.0.3';
import { Episode, useGlobalAudioPlayer } from './useGlobalAudioPlayer';

export const useEpisodePlayer = () => {
  const globalAudio = useGlobalAudioPlayer();

  // This hook is now primarily used for VIP episodes that have direct audio URLs
  // External platform episodes (Spotify, Apple, YouTube) are handled by the ListenOnMenu component
  const playEpisode = async (episode: any) => {
    try {
      console.log('Playing episode:', episode.title);
      console.log('Episode data:', episode);
      
      // Check if this is a VIP episode with direct audio URL
      if (episode.audioUrl && episode.audioUrl !== '' && !episode.externalEpisode) {
        console.log('VIP episode with direct audio URL detected');
        toast.loading('Preparing audio...');
        
        const audioEpisode: Episode = {
          id: episode.id.toString(),
          title: episode.title,
          guest: episode.guest ? { name: episode.guest.name || episode.guest } : undefined,
          image: episode.image,
          audioUrl: episode.audioUrl,
          duration: episode.duration || 300
        };
        
        globalAudio.setCurrentEpisode(audioEpisode);
        globalAudio.actions.load(audioEpisode.audioUrl);
        
        toast.dismiss();
        toast.success('Audio ready to play!');
        return;
      }
      
      // For all other episodes, show a message that they should use the Listen On menu
      toast.info('Use the Play button to access listening options for this episode.');
      
    } catch (error) {
      console.error('Error playing episode:', error);
      toast.dismiss();
      toast.error('Failed to prepare audio. Please try again.');
    }
  };

  const miniPlayerControls = {
    onNext: () => {
      globalAudio.actions.playNext();
    },
    onPrevious: () => {
      globalAudio.actions.playPrevious();
    },
    onClose: () => {
      globalAudio.actions.reset();
    },
    onExpand: () => {
      return true;
    }
  };

  // Call this when a user taps play inside an episode list so next/prev work correctly
  const setQueue = (episodes: any[], startIndex = 0) => {
    const mapped = episodes
      .filter(ep => ep.audioUrl && !ep.externalEpisode)
      .map(ep => ({
        id: ep.id.toString(),
        title: ep.title,
        guest: ep.guest ? { name: ep.guest.name || ep.guest } : undefined,
        image: ep.image,
        audioUrl: ep.audioUrl,
        duration: ep.duration || 300,
      }));
    globalAudio.actions.setQueue(mapped, startIndex);
  };

  return {
    playEpisode,
    miniPlayerControls,
    currentEpisode: globalAudio.currentEpisode,
    hasNext: globalAudio.hasNext,
    hasPrevious: globalAudio.hasPrevious,
    setQueue,
  };
};