import React from 'react';
import {Composition} from 'remotion';
import {TechNewsVideo} from './TechNewsVideo';
import {videoData} from './videoData';

export const Root: React.FC = () => {
  return (
    <Composition
      id="TechNewsEpisode"
      component={TechNewsVideo}
      durationInFrames={videoData.durationInFrames}
      fps={videoData.fps}
      width={1080}
      height={1920}
      defaultProps={{data: videoData}}
    />
  );
};
