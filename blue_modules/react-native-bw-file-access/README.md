# react-native-bw-file-access

A custom package written to allow BlueWallet to open files directly from the Files app in iOS. We make use of `startAccessingSecurityScopedResource()` and `stopAccessingSecurityScopedResource()`.

Read Apple's documentation to understand more about the Open-in-Place mechanics for accessing files which are not in an apps sandbox environment.
[Link here](https://developer.apple.com/documentation/uikit/documents_data_and_pasteboard/synchronizing_documents_in_the_icloud_environment#3743499).
