import AsyncStorage from '@react-native-community/async-storage';
import { applyMiddleware, compose, createStore, Middleware, Store } from 'redux';
import { persistReducer, persistStore } from 'redux-persist';
import thunk from 'redux-thunk';

import { rootReducer, ApplicationState } from '.';

const middlewares: Middleware[] = [thunk];

function bindMiddleware(middleware: Middleware[]) {
  if (__DEV__) {
    const composeEnhancers = (global as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

    return composeEnhancers(applyMiddleware(...middleware));
  }

  return applyMiddleware(...middlewares);
}

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['wallets'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const configureStore = (): Store<ApplicationState> => createStore(persistedReducer, bindMiddleware(middlewares));

export const store = configureStore();
export const persistor = persistStore(store);
