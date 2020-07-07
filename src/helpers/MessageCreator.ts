import { ButtonProps } from 'react-native-elements';

import { images as appImages } from 'app/assets';
import { Route } from 'app/consts';
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

export const CreateMessage = (message: Message) => {
  const processingImageStyle = {
    height: 180,
    width: 161,
    marginVertical: 36,
  };
  return NavigationService.navigate(Route.Message, {
    title: message.title,
    description: message.description,
    source: images[message.type],
    imageStyle: message.type === MessageType.processingState ? processingImageStyle : null,
    buttonProps: message.buttonProps,
    asyncTask: message.asyncTask,
  });
};
