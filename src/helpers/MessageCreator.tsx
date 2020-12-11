import React from 'react';
import { ButtonProps } from 'react-native-elements';

import { images as appImages } from 'app/assets';
import { Route } from 'app/consts';
import { MessageScreen } from 'app/screens';
import { NavigationService } from 'app/services';

export enum MessageType {
  success,
  error,
  processingState,
}

const images = {
  [MessageType.success]: appImages.success,
  [MessageType.error]: appImages.errorState,
  [MessageType.processingState]: appImages.processingState,
};

interface Message {
  title: string;
  description: string;
  type: MessageType;
  buttonProps?: ButtonProps;
  asyncTask?: () => void;
}

const processingImageStyle = {
  height: 180,
  width: 161,
  marginVertical: 36,
};

export const CreateMessage = (message: Message) => {
  return NavigationService.navigate(Route.Message, {
    title: message.title,
    description: message.description,
    source: images[message.type],
    testID: `${MessageType[message.type]}-message`,
    imageStyle: message.type === MessageType.processingState ? processingImageStyle : null,
    buttonProps: message.buttonProps,
    asyncTask: message.asyncTask,
  });
};

export const RenderMessage = (message: Message) => {
  return (
    <MessageScreen
      route={{
        key: Route.Message,
        name: Route.Message,
        params: {
          title: message.title,
          description: message.description,
          source: images[message.type],
          testID: `${MessageType[message.type]}-message`,
          imageStyle: message.type === MessageType.processingState ? processingImageStyle : null,
          buttonProps: message.buttonProps,
          asyncTask: message.asyncTask,
        },
      }}
    />
  );
};
