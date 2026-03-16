import React from 'react';

export const ConnectionPollContext = React.createContext<{ pollConnection: () => void } | null>(null);
