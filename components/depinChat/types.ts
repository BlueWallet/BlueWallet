export interface DePINChatProps {
  walletID: string;
  /**
   * The chat stays mounted behind another wallet tab, or under another screen,
   * to keep its state. While not on screen it must not poll: each poll marks
   * the pool as read (clearing the tab's new-message dot unseen) and, on a
   * hardware wallet, takes the device a user action on top may be waiting for.
   */
  paused?: boolean;
  /** Called with true while a token conversation (with its input bar) is open, false on the token picker. */
  onConversationOpenChange?: (open: boolean) => void;
  /** The DePIN server has traffic this wallet has not read yet (see useDepinPoolWatch). */
  hasNewMessages?: boolean;
  /** Unread messages per token, as the chat last counted them. */
  unreadCounts?: Record<string, number>;
}

export interface DePINChatHandle {
  /** Handle a back action: true = consumed (closed the open token chat), false = nothing to close. */
  goBack: () => boolean;
}

/** Server DePIN configuration reported by `depingetmsginfo`. */
export interface DepinServerInfo {
  enabled?: boolean;
  token?: string;
  cipher?: string;
  maxrecipients?: number;
  maxmessagesize?: number;
  messageexpiryhours?: number;
  maxpoolsizemb?: number;
}
