# libwalletsodium.so binds its functions by class and method name (JNI).
-keep class org.neurai.walletcrypto.WalletSodium {
    native <methods>;
}
