platform :ios do
  desc "Clear derived data"
  lane :clear_derived_data_lane do
    UI.message("Clearing derived data...")
    clear_derived_data
  end

  desc "Increment build number"
  lane :increment_build_number_lane do
    build_number = ENV["NEW_BUILD_NUMBER"].to_s
    UI.user_error!("NEW_BUILD_NUMBER is required") if build_number.empty?
    UI.user_error!("NEW_BUILD_NUMBER must contain digits only") unless build_number.match?(/\A\d+\z/)
    UI.user_error!("NEW_BUILD_NUMBER must be positive") if build_number.to_i.zero?
    UI.message("Setting build number to #{build_number}...")

    # Set the new build number
    increment_build_number(
      xcodeproj: "ios/BlueWallet.xcodeproj",
      build_number: build_number
    )

    UI.message("Build number set to: #{build_number}")
  end

  desc "Install CocoaPods dependencies"
  lane :install_pods do
    UI.message("Installing CocoaPods dependencies...")
    cocoapods(
      podfile: "ios/Podfile",
      try_repo_update_on_error: true,
      repo_update: true,
      clean_install: true
    )
  end

  desc "Upload an Apple artifact and wait until it is ready in TestFlight"
  private_lane :upload_apple_testflight do |options|
    platform = options[:platform].to_s
    artifact_path = File.expand_path(options[:artifact_path].to_s, PROJECT_ROOT)
    artifact_option = platform == "ios" ? :ipa : :pkg
    expected_extension = platform == "ios" ? ".ipa" : ".pkg"
    UI.user_error!("platform must be ios or catalyst") unless %w[ios catalyst].include?(platform)
    UI.user_error!("#{platform} artifact must be a #{expected_extension} file") unless File.extname(artifact_path) == expected_extension
    UI.user_error!("#{platform} artifact not found at #{artifact_path}") unless File.file?(artifact_path)

    key_content = ENV['APP_STORE_CONNECT_API_KEY_CONTENT']
    if key_content.to_s.empty?
      api_key_path = File.expand_path(ENV['APP_STORE_CONNECT_API_KEY_PATH'] || "appstore_api_key.json", PROJECT_ROOT)
      UI.user_error!("App Store Connect API key JSON not found at #{api_key_path}") unless File.file?(api_key_path)
      authentication = { api_key_path: api_key_path }
    else
      begin
        credentials = JSON.parse(key_content, symbolize_names: true)
      rescue JSON::ParserError
        UI.user_error!("APP_STORE_CONNECT_API_KEY_CONTENT must contain a Fastlane API key JSON object")
      end
      unless credentials.is_a?(Hash) && %i[key_id key].all? { |field| credentials[field].is_a?(String) && !credentials[field].empty? }
        UI.user_error!("App Store Connect API key JSON requires key_id and key")
      end

      api_key = app_store_connect_api_key(
        key_id: credentials[:key_id],
        issuer_id: credentials[:issuer_id],
        key_content: credentials[:key],
        is_key_content_base64: credentials.fetch(:is_key_content_base64, false),
        duration: credentials[:duration],
        in_house: credentials.fetch(:in_house, false),
        set_spaceship_token: false
      )
      authentication = { api_key: api_key }
    end

    branch_name = ENV['BRANCH_NAME'] || "unknown-branch"
    last_commit_message = ENV['LATEST_COMMIT_MESSAGE'] || "No commit message found"
    changelog = "Build Information:\n"
    changelog += "- Branch: #{branch_name}\n" unless branch_name == "master"
    changelog += "- Commit: #{last_commit_message}\n"

    upload_options = {
      **authentication,
      skip_waiting_for_build_processing: false,
      wait_processing_timeout_duration: 5_400,
      changelog: changelog,
      artifact_option => artifact_path
    }
    UI.message("Uploading #{platform} artifact to TestFlight from #{artifact_path}")
    upload_to_testflight(**upload_options)
  end

  desc "Upload IPA to TestFlight"
  lane :upload_to_testflight_lane do
    upload_apple_testflight(
      platform: "ios",
      artifact_path: ENV['IPA_OUTPUT_PATH']
    )
    UI.success("iOS build finished processing in TestFlight!")
  end

  desc "Install signing assets and build an iOS release archive"
  lane :build_signed_ios_release do
    keychain_name = "bluewallet_ios_#{SecureRandom.hex(8)}"
    begin
      create_temp_keychain(name: keychain_name)
      setup_provisioning_profiles(keychain_name: keychain_name)
      build_app_lane
    ensure
      build_error = $!
      begin
        delete_temp_keychain(name: keychain_name)
      rescue => cleanup_error
        UI.error("Could not delete temporary keychain: #{cleanup_error.message}")
        raise cleanup_error unless build_error
      end
    end
  end

  desc "Build the iOS app"
  lane :build_app_lane do
    project_version = ENV['PROJECT_VERSION'] || get_version_number(
      xcodeproj: "ios/BlueWallet.xcodeproj",
      target: "BlueWallet",
      configuration: "Release"
    )
    commit_subject = last_git_commit&.fetch(:message, nil).to_s.lines.first.to_s.chomp
    ipa_name = "BlueWallet_#{project_version}_#{ENV['NEW_BUILD_NUMBER']}.ipa"
    build_logs_dir = File.join(PROJECT_ROOT, "ios", "build_logs")

    clear_derived_data_lane

    begin
      ipa_path = build_ios_app(
        scheme: "BlueWallet",
        workspace: File.join(PROJECT_ROOT, "ios", "BlueWallet.xcworkspace"),
        export_method: "app-store",
        export_options: File.join(PROJECT_ROOT, "ios", "export_options.plist"),
        output_directory: File.join(PROJECT_ROOT, "ios", "build"),
        output_name: ipa_name,
        buildlog_path: build_logs_dir
      )
    rescue
      build_log = Dir.glob(File.join(build_logs_dir, "*.log")).max_by { |path| File.mtime(path) }
      provisioning_error = provisioning_profile_build_error_message(build_log ? File.read(build_log) : "")
      UI.user_error!(provisioning_error) unless provisioning_error.nil?
      raise
    end

    UI.user_error!("Fastlane did not produce an IPA") unless ipa_path && File.file?(ipa_path)
    ENV['IPA_OUTPUT_PATH'] = ipa_path

    write_github_output(
      ipa_output_path: ipa_path, ipa_filename: File.basename(ipa_path),
      project_version: project_version, commit_message: commit_subject
    )
  end

  desc "Upload an iOS source map and bundle to Bugsnag manually"
  lane :upload_bugsnag_sourcemaps do
    ensure_env_vars(%w[BUGSNAG_API_KEY BUGSNAG_SOURCE_MAP BUGSNAG_MINIFIED_FILE PROJECT_VERSION NEW_BUILD_NUMBER])
    version = ENV.fetch('PROJECT_VERSION')
    bugsnag_sourcemaps_upload(
      api_key: ENV.fetch('BUGSNAG_API_KEY'),
      source_map: File.expand_path(ENV.fetch('BUGSNAG_SOURCE_MAP'), PROJECT_ROOT),
      minified_file: File.expand_path(ENV.fetch('BUGSNAG_MINIFIED_FILE'), PROJECT_ROOT),
      code_bundle_id: "#{version}-#{ENV.fetch('NEW_BUILD_NUMBER')}",
      release_stage: ENV.fetch('BUGSNAG_RELEASE_STAGE', 'production'),
      app_version: version
    )
  end
  desc "Build and deploy iOS to TestFlight"
  lane :deploy do
    increment_build_number_lane
    install_pods unless File.directory?(File.join(PROJECT_ROOT, "ios", "Pods"))
    build_signed_ios_release
    upload_to_testflight_lane
  end
end
