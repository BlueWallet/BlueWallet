export function deriveEmailForWallet(wallet) {
  return `${wallet.getID()}@bluewallet.io`;
}

export function deriveUsernameForWallet(wallet) {
  return `blueWallet-kollider-username-${wallet.getID()}`;
}

export function derivePasswordForWallet(wallet) {
  return `blueWallet-kollider-password-${wallet.getID()}`;
}

export function deriveCredentialsForWallet(wallet) {
  return {
    username: deriveUsernameForWallet(wallet),
    password: derivePasswordForWallet(wallet),
    email: deriveEmailForWallet(wallet),
  };
}
