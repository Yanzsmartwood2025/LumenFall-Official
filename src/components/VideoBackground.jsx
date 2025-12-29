import React, { useEffect, useRef, useState } from 'react';

const VideoBackground = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = useRef([React.createRef(), React.createRef()]);
  const [activeVideoLayer, setActiveVideoLayer] = useState(0);

  const playlist = [
    '/assets/videos/video-libro.mp4',
    '/assets/videos/video-juego.mp4',
    '/assets/videos/video-musica.mp4',
    '/assets/videos/video-ropa.mp4'
  ];

  useEffect(() => {
    const activeVideo = videoRefs.current[activeVideoLayer].current;
    if (activeVideo) {
      activeVideo.src = playlist[currentVideoIndex];
      activeVideo.load();
      activeVideo.oncanplay = () => {
        activeVideo.play().catch(e => console.log("Autoplay prevented", e));
      };
      activeVideo.onended = handleVideoEnd;
    }
  }, []);

  const handleVideoEnd = () => {
    const nextIndex = (currentVideoIndex + 1) % playlist.length;
    const nextLayer = activeVideoLayer === 0 ? 1 : 0;

    const nextVideo = videoRefs.current[nextLayer].current;

    if (nextVideo) {
      nextVideo.src = playlist[nextIndex];
      nextVideo.load();
      nextVideo.oncanplay = () => {
        nextVideo.play().then(() => {
          setActiveVideoLayer(nextLayer);
          setCurrentVideoIndex(nextIndex);
          // Set up end handler for the new video
          nextVideo.onended = handleVideoEnd;
        }).catch(e => console.error("Error playing next video:", e));
      };
    }
  };

  return (
    <div id="bg-video-container" className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden bg-black">
      <video
        ref={videoRefs.current[0]}
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${activeVideoLayer === 0 ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
      />
      <video
        ref={videoRefs.current[1]}
        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${activeVideoLayer === 1 ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
      />
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10 pointer-events-none opacity-0"></div>
    </div>
  );
};

export default VideoBackground;
