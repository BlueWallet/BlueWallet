{
  # If you want to use the in-tree version of nixpkgs:
  pkgs ? import <nixpkgs> {
    config.allowUnfree = true;
  },

  config ? pkgs.config
}:

pkgs.mkShellNoCC rec {
  name = "react-native-env-ios";
  packages = with pkgs; [
    yarn
    nodejs
    # cocoapods
  ];

  LANG = "en_US.UTF-8";

  shellHook = ''
    export PATH="/usr/local/bin:/usr/bin:/bin:$PATH";
  '';
}
