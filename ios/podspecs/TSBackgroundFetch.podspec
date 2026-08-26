# Local override of the CocoaPods trunk TSBackgroundFetch pod.
#
# Trunk 4.1.1 ships an XCFramework zip with only ios-arm64 + simulator slices.
# The copy bundled inside react-native-background-fetch also includes
# ios-arm64_x86_64-maccatalyst, which Mac Catalyst archives require.
#
# Keep version aligned with RNBackgroundFetch's dependency (~> 4.1.0).
Pod::Spec.new do |s|
  s.name         = 'TSBackgroundFetch'
  s.version      = '4.1.1'
  s.summary      = 'Background fetch & periodic background tasks for iOS.'
  s.homepage     = 'https://github.com/transistorsoft/transistor-background-fetch'
  s.license      = { :type => 'MIT' }
  s.author       = { 'Transistor Software' => 'info@transistorsoft.com' }
  s.platforms    = { :ios => '12.0' }
  s.source       = { :path => '.' }
  s.vendored_frameworks = '../../node_modules/react-native-background-fetch/ios/RNBackgroundFetch/TSBackgroundFetch.xcframework'
  s.frameworks = 'UIKit'
  s.weak_frameworks = 'BackgroundTasks'
  s.static_framework = true
  s.pod_target_xcconfig = { 'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES' }
end
