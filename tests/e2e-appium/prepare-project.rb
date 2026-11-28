require 'xcodeproj'
require 'fileutils'

bundle_id = ENV.fetch('CATALYST_BUNDLE_ID', 'io.bluewallet.bluewallet.e2e')
abort 'CATALYST_BUNDLE_ID must end in .e2e (test data is reset)' unless bundle_id.end_with?('.e2e')
abort 'Set CATALYST_TEAM_ID to the team that signs the Catalyst E2E app' if ENV.fetch('CATALYST_TEAM_ID', '').empty?

# A disposable project alongside the original preserves relative source/pod paths.
# Never change the signing, storage, or bundling settings of a release project.
source = 'ios/BlueWallet.xcodeproj'
destination = 'ios/BlueWalletE2E.xcodeproj'
FileUtils.rm_rf(destination)
FileUtils.cp_r(source, destination)
project = Xcodeproj::Project.open(destination)
project.targets.each do |target|
  target.shell_script_build_phases.select { |phase| phase.name.include?('Bugsnag') }.each(&:remove_from_project)
  target.build_configurations.each do |config|
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "io.bluewallet.bluewallet.e2e.#{target.name}"
    config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
  end
end
app = project.targets.find { |target| target.name == 'BlueWallet' }
# Extensions are not part of this app UI suite and require separate profiles.
app.copy_files_build_phases.select { |phase| phase.dst_subfolder_spec == '13' }.each(&:remove_from_project)
app.dependencies.each(&:remove_from_project)
# Declare the generated resource so incremental builds re-sign after JS changes.
# The upstream phase has no outputs, which can leave the prior resource seal intact.
bundle_phase = app.shell_script_build_phases.find { |phase| phase.name == 'Bundle React Native code and images' }
bundle_phase.output_paths = ['$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/main.jsbundle']
bundle_phase.always_out_of_date = '1'
app.build_configurations.each do |config|
  config.build_settings.keys.grep(/^(CODE_SIGN_IDENTITY|CODE_SIGN_ENTITLEMENTS|PROVISIONING_PROFILE|DEVELOPMENT_TEAM)/).each { |key| config.build_settings.delete(key) }
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = bundle_id
  config.build_settings['CODE_SIGNING_ALLOWED'] = 'YES'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = '../tests/e2e-appium/e2e.entitlements'
  config.build_settings['CODE_SIGN_STYLE'] = ENV['CATALYST_PROVISIONING_PROFILE'] ? 'Manual' : 'Automatic'
  config.build_settings['DEVELOPMENT_TEAM'] = ENV.fetch('CATALYST_TEAM_ID')
  config.build_settings['CODE_SIGN_IDENTITY'] = ENV.fetch('CATALYST_SIGNING_IDENTITY', 'Apple Development')
  config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ENV.fetch('CATALYST_PROVISIONING_PROFILE', '')
  config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = '$(inherited) CATALYST_E2E'
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.save_as(destination, 'BlueWalletE2E', true)
workspace = Xcodeproj::Workspace.new(nil)
workspace << 'BlueWalletE2E.xcodeproj'
workspace << 'Pods/Pods.xcodeproj'
workspace.save_as('ios/BlueWalletE2E.xcworkspace')
