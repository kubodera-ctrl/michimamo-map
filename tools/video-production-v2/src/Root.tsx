import React from 'react';
import {Composition,Folder} from 'remotion';
import {MachimamoVideo} from './MachimamoVideo';
import {longDefault,shortDefault} from './defaults';
import type {MachimamoVideoProps} from './types';

const calculateMetadata=({props}:{props:MachimamoVideoProps})=>({
  durationInFrames:Math.round(props.durationSeconds*30),
  fps:30,
  width:1080,
  height:1920
});

export const RemotionRoot:React.FC=()=>(
  <Folder name="Machimamo">
    <Composition<MachimamoVideoProps>
      id="MachimamoShortV2"
      component={MachimamoVideo}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={Math.round(shortDefault.durationSeconds*30)}
      calculateMetadata={calculateMetadata}
      defaultProps={shortDefault}
    />
    <Composition<MachimamoVideoProps>
      id="MachimamoLongV2"
      component={MachimamoVideo}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={Math.round(longDefault.durationSeconds*30)}
      calculateMetadata={calculateMetadata}
      defaultProps={longDefault}
    />
  </Folder>
);
