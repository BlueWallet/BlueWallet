# Define app identifiers once for reuse across lanes
def app_identifiers
  [
    "io.bluewallet.bluewallet",
    "io.bluewallet.bluewallet.Stickers",
    "io.bluewallet.bluewallet.MarketWidget",
    "io.bluewallet.bluewallet.QuickLookPreview",
    "io.bluewallet.bluewallet.QuickLookThumbnail"
  ]
end

platform :ios do
  # Add helper methods for error handling and retries
  def ensure_env_vars(vars)
    vars.each do |var|
      UI.user_error!("#{var} environment variable is missing") if ENV[var].nil? || ENV[var].empty?
    end
  end

  def resolve_signing_value(options:, option_name:, env_name:, prompt:, sensitive: false)
    value = options[option_name] || ENV[env_name]
    value = sensitive ? UI.password(prompt) : UI.input(prompt) if value.nil? || value.empty?
    UI.user_error!("#{env_name} is required") if value.nil? || value.empty?

    ENV[env_name] = value
  end

  # Accept a URL copied from Markdown (for example, [certificates](https://...)).
  # This prevents git from receiving a literal `]https://` protocol.
  def normalize_signing_git_url(value)
    return value if value.start_with?("https://", "http://", "git@", "ssh://")

    extracted_url = value.match(%r{https?://[^\s\]\)]+})&.to_s
    return value if extracted_url.nil?

    UI.important("Extracted the certificates repository URL from pasted Markdown")
    extracted_url
  end

  # Match can use an App Store Connect API key directly, avoiding an expired
  # FASTLANE_SESSION and an interactive Apple ID login in CI.
  def match_api_authentication(options)
    key_id = options[:apple_api_key_id] || ENV["APPLE_API_KEY_ID"]
    issuer_id = options[:apple_api_issuer_id] || ENV["APPLE_API_ISSUER_ID"]
    configured_path = options[:apple_api_key_path] || ENV["APPLE_API_KEY_PATH"]
    key_path = File.expand_path(configured_path || "appstore_api_key.json", PROJECT_ROOT)
    configured_values = [key_id, issuer_id, configured_path, File.file?(key_path) ? key_path : nil]

    return nil if configured_values.all? { |value| value.nil? || value.empty? }

    if File.extname(key_path) == ".json" && File.file?(key_path)
      UI.message("Using App Store Connect API-key JSON authentication for Match")
      return { api_key_path: key_path }
    end

    missing_values = []
    missing_values << "APPLE_API_KEY_ID" if key_id.nil? || key_id.empty?
    missing_values << "APPLE_API_ISSUER_ID" if issuer_id.nil? || issuer_id.empty?
    missing_values << "APPLE_API_KEY_PATH" unless File.file?(key_path)
    unless missing_values.empty?
      UI.user_error!(
        "Incomplete App Store Connect API-key configuration: #{missing_values.join(', ')}. " \
        "Set APPLE_API_KEY_ID, APPLE_API_ISSUER_ID, and APPLE_API_KEY_PATH to a readable .p8 key, " \
        "or provide a Fastlane API-key JSON file."
      )
    end

    UI.message("Using App Store Connect API-key authentication for Match")
    {
      api_key: app_store_connect_api_key(
        key_id: key_id,
        issuer_id: issuer_id,
        key_filepath: key_path,
        duration: 1200,
        in_house: false
      )
    }
  end

  def ensure_match_apple_auth!(options)
    api_authentication = match_api_authentication(options)
    return api_authentication unless api_authentication.nil?

    options = options.merge(apple_id: ENV["FASTLANE_USER"]) if (options[:apple_id].nil? || options[:apple_id].empty?) && !ENV["FASTLANE_USER"].to_s.empty?
    resolve_signing_value(
      options: options,
      option_name: :apple_id,
      env_name: "APPLE_ID",
      prompt: "Apple ID email:"
    )
    ENV["FASTLANE_USER"] ||= ENV["APPLE_ID"]

    return nil unless ENV["FASTLANE_SESSION"].to_s.empty? && ENV["FASTLANE_PASSWORD"].to_s.empty?

    unless UI.interactive?
      UI.user_error!(
        "Apple authentication is required in non-interactive environments. Prefer APPLE_API_KEY_ID, " \
        "APPLE_API_ISSUER_ID, and APPLE_API_KEY_PATH; alternatively provide FASTLANE_SESSION or FASTLANE_PASSWORD."
      )
    end

    require "shellwords"
    UI.message("No reusable Apple session was provided; refreshing it with spaceauth before Match")
    begin
      sh("bundle exec fastlane spaceauth -u #{Shellwords.shellescape(ENV["APPLE_ID"])}")
    rescue => error
      UI.user_error!(
        "Could not refresh the Apple session with spaceauth: #{error.message}. " \
        "Complete the Apple MFA prompt, or configure an App Store Connect API key."
      )
    end

    nil
  end

  # The Preview extension reads the app's cached fiat rate from this group. App
  # Groups are a Developer Portal capability, so they must be enabled before
  # Match creates a profile for a newly-added extension identifier.
  def ensure_quick_look_app_group!(developer_team_id)
    group_identifier = "group.io.bluewallet.bluewallet"
    extension_identifiers = ["io.bluewallet.bluewallet.QuickLookPreview"]

    if !UI.interactive? && ENV["FASTLANE_SESSION"].to_s.empty? && ENV["FASTLANE_PASSWORD"].to_s.empty?
      UI.important(
        "Skipping Quick Look App Group synchronization: legacy Developer Portal authentication is unavailable. " \
        "Provide FASTLANE_SESSION or FASTLANE_PASSWORD when creating the extension profile for the first time."
      )
      return
    end

    require "spaceship"
    UI.message("Synchronizing Quick Look App Group capability in the Developer Portal")
    Spaceship::Portal.login(ENV["FASTLANE_USER"], ENV["FASTLANE_PASSWORD"])
    Spaceship::Portal.client.team_id = developer_team_id

    group = Spaceship::Portal.app_group.find(group_identifier)
    group ||= Spaceship::Portal.app_group.create!(
      group_id: group_identifier,
      name: "BlueWallet Shared Data"
    )

    extension_identifiers.each do |bundle_identifier|
      app = Spaceship::Portal.app.find(bundle_identifier)
      UI.user_error!("Could not find App ID #{bundle_identifier} in the Developer Portal") if app.nil?

      app.update_service(Spaceship::Portal.app_service.app_group.on)
      app.associate_groups([group])
    end
  rescue => error
    UI.user_error!(
      "Could not synchronize the Quick Look App Group capability: #{error.message}. " \
      "Enable #{group_identifier} for QuickLookPreview in the Apple Developer portal and retry."
    )
  end

  def normalize_git_basic_authorization(value)
    github_token = value.match?(/\A(?:github_pat_|gh[pousr]_)/)
    return value unless github_token

    require "base64"
    Base64.strict_encode64("x-access-token:#{value}")
  end

  def resolve_git_access_token(options)
    value = options[:git_access_token] || ENV["GIT_ACCESS_TOKEN"]
    return value unless value.nil? || value.empty?

    unless UI.interactive?
      UI.user_error!(
        "GIT_ACCESS_TOKEN is required in non-interactive environments. " \
        "Set it to a GitHub token or Base64 Git basic authorization."
      )
    end

    gh_available = system("gh", "--version", out: File::NULL, err: File::NULL)
    if gh_available && UI.confirm("GIT_ACCESS_TOKEN is not set. Log in to GitHub through your browser?")
      authenticated = system(
        "gh", "auth", "login",
        "--hostname", "github.com",
        "--git-protocol", "https",
        "--web"
      )
      UI.user_error!("GitHub browser login did not complete successfully") unless authenticated

      require "open3"
      token, error, status = Open3.capture3("gh", "auth", "token", "--hostname", "github.com")
      UI.user_error!("Could not retrieve the GitHub token: #{error.strip}") unless status.success?
      value = token.strip
    else
      UI.important("GitHub CLI is unavailable or browser login was declined; enter a token manually.")
      value = UI.password("GitHub access token (or Base64 Git basic authorization):")
    end

    UI.user_error!("GIT_ACCESS_TOKEN is required") if value.nil? || value.empty?
    ENV["GIT_ACCESS_TOKEN"] = value
  end

  def resolve_developer_team_id(options)
    value = options[:team_id] || ENV["ITC_TEAM_ID"]
    unless value.nil? || value.empty?
      ENV["ITC_TEAM_ID"] = value
      return value
    end

    require "xcodeproj"
    project_path = File.join(PROJECT_ROOT, "ios", "BlueWallet.xcodeproj")
    project = Xcodeproj::Project.open(project_path)
    project_team_ids = project.targets.flat_map do |target|
      target.build_configurations.flat_map do |configuration|
        configuration.build_settings.filter_map do |setting, setting_value|
          setting_value if setting == "DEVELOPMENT_TEAM" || setting.start_with?("DEVELOPMENT_TEAM[")
        end
      end
    end.compact.reject(&:empty?).uniq

    if project_team_ids.one?
      value = project_team_ids.first
      UI.message("Using Developer Team ID #{value} from ios/BlueWallet.xcodeproj")
    elsif project_team_ids.length > 1
      if UI.interactive?
        value = UI.select("Multiple DEVELOPMENT_TEAM values were found. Select one:", project_team_ids)
      else
        UI.user_error!(
          "Multiple DEVELOPMENT_TEAM values found in #{project_path}: #{project_team_ids.join(', ')}. " \
          "Set ITC_TEAM_ID explicitly."
        )
      end
    elsif UI.interactive?
      value = UI.input("Apple Developer Team ID:")
    else
      UI.user_error!("No DEVELOPMENT_TEAM found in #{project_path}; set ITC_TEAM_ID explicitly")
    end

    UI.user_error!("Apple Developer Team ID is required") if value.nil? || value.empty?
    ENV["ITC_TEAM_ID"] = value
  end

  def provisioning_profile_build_error_message(log_contents)
    capability_patterns = [
      /provisioning profile .* doesn't include/i,
      /profile doesn't match the entitlements/i
    ]
    if capability_patterns.any? { |pattern| log_contents.match?(pattern) }
      return "A selected provisioning profile does not contain the target's required capabilities or entitlements. " \
             "Run `bundle exec fastlane ios setup_provisioning_profiles` to remap profiles, then renew the affected " \
             "profile in Match if its App ID capabilities changed."
    end

    missing_patterns = [
      /no profile for team/i,
      /no (?:matching )?provisioning profiles? found/i,
      /provisioning profile .* not found/i,
      /requires a provisioning profile/i,
      /couldn't find any provisioning profiles?/i
    ]
    return nil unless missing_patterns.any? { |pattern| log_contents.match?(pattern) }

    "The App Store provisioning profiles selected by the Xcode project are not installed. " \
      "Run `bundle exec fastlane ios setup_provisioning_profiles` before building and ensure " \
      "the Match repository contains profiles for every app identifier."
  end

  def log_success(message)
    UI.success("✅ #{message}")
  end

  def log_error(message)
    UI.error("❌ #{message}")
  end

  # Method to safely call actions with retry logic
  def with_retry(max_attempts = 3, action_name = "")
    attempts = 0
    begin
      attempts += 1
      yield
    rescue => e
      if attempts < max_attempts
        wait_time = 10 * attempts
        log_error("Attempt #{attempts}/#{max_attempts} for #{action_name} failed: #{e.message}")
        UI.message("Retrying in #{wait_time} seconds...")
        sleep(wait_time)
        retry
      else
        log_error("#{action_name} failed after #{max_attempts} attempts: #{e.message}")
        raise e
      end
    end
  end

  desc "Register new devices from a file"
  lane :register_devices_from_txt do
    ensure_env_vars(["GIT_URL", "GIT_ACCESS_TOKEN"])
    UI.message("Registering new devices from file...")

    csv_path = "../../devices.txt" # Update this with the actual path to your file

    # Register devices using the devices_file parameter
    register_devices(
      devices_file: csv_path
    )

    UI.message("Devices registered successfully.")

    # Update provisioning profiles for all app identifiers
    app_identifiers.each do |app_identifier|
      match(
        git_url: normalize_signing_git_url(ENV["GIT_URL"]),
        git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
        type: "development",
        app_identifier: app_identifier,
        readonly: false, # Regenerate provisioning profile if needed
        force_for_new_devices: true,
        clone_branch_directly: true
      )
    end

    UI.message("Development provisioning profiles updated.")
  end

  desc "Create a temporary keychain"
  lane :create_temp_keychain do |options|
    keychain_name = options[:name] || "temp_keychain"
    timeout = Integer(options[:timeout] || 3600)
    UI.message("Creating temporary keychain #{keychain_name}...")

    create_keychain(
      name: keychain_name,
      password: ENV["KEYCHAIN_PASSWORD"],
      default_keychain: true,
      unlock: true,
      timeout: timeout,
      lock_when_sleeps: true
    )

    UI.message("Temporary keychain #{keychain_name} created successfully.")
  end

  desc "Synchronize certificates and provisioning profiles"
  lane :setup_provisioning_profiles do |options|
    required_vars = ["GIT_ACCESS_TOKEN", "GIT_URL", "ITC_TEAM_ID", "ITC_TEAM_NAME", "KEYCHAIN_PASSWORD"]
    ensure_env_vars(required_vars)

    UI.message("Setting up provisioning profiles...")
    profile_mapping = {}

    with_retry(3, "Fetching iOS provisioning profiles") do
      match(
        git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
        git_url: normalize_signing_git_url(ENV["GIT_URL"]),
        type: "appstore",
        clone_branch_directly: true,
        platform: "ios",
        app_identifier: app_identifiers,
        team_id: ENV["ITC_TEAM_ID"],
        team_name: ENV["ITC_TEAM_NAME"],
        readonly: true,
        keychain_name: options[:keychain_name] || "temp_keychain",
        keychain_password: ENV["KEYCHAIN_PASSWORD"]
      )

      match_mapping = lane_context[SharedValues::MATCH_PROVISIONING_PROFILE_MAPPING] || {}
      profile_mapping = app_identifiers.to_h do |identifier|
        profile = match_mapping[identifier]
        UI.user_error!("Match did not install an App Store profile for #{identifier}") if profile.to_s.empty?
        [identifier, profile]
      end
    end

    require "xcodeproj"
    project_path = File.join(PROJECT_ROOT, "ios", "BlueWallet.xcodeproj")
    project = Xcodeproj::Project.open(project_path)
    configured_identifiers = []

    project.targets.each do |target|
      target.build_configurations.select { |configuration| configuration.name == "Release" }.each do |configuration|
        app_identifier = configuration.build_settings["PRODUCT_BUNDLE_IDENTIFIER"]
        profile_name = profile_mapping[app_identifier]
        next if profile_name.nil?

        configuration.build_settings["CODE_SIGN_STYLE"] = "Manual"
        configuration.build_settings["DEVELOPMENT_TEAM"] = ENV["ITC_TEAM_ID"]
        configuration.build_settings["CODE_SIGN_IDENTITY[sdk=iphoneos*]"] = "Apple Distribution"
        configuration.build_settings["PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]"] = profile_name
        configured_identifiers << app_identifier
        UI.message("Configured target #{target.name} with #{profile_name}")
      end
    end

    missing_identifiers = profile_mapping.keys - configured_identifiers.uniq
    unless missing_identifiers.empty?
      UI.user_error!("No Release target found for bundle identifiers: #{missing_identifiers.join(', ')}")
    end
    project.save

    export_options_path = File.join(PROJECT_ROOT, "ios", "export_options.plist")
    export_options = Xcodeproj::Plist.read_from_path(export_options_path)
    export_options["provisioningProfiles"] = profile_mapping
    Xcodeproj::Plist.write_to_path(export_options, export_options_path)

    UI.message("Using App Store provisioning profiles:")
    profile_mapping.each { |app_identifier, profile_name| UI.message("  #{app_identifier}: #{profile_name}") }

    log_success("All provisioning profiles set up")
  end

  # Run from the repository root: bundle exec fastlane update_apple_signing_assets
  desc "Update all Apple certificates and provisioning profiles"
  lane :update_apple_signing_assets do |options|
    minimum_fastlane_version = Gem::Version.new("2.240.0")
    current_fastlane_version = Gem::Version.new(Fastlane::VERSION)
    if current_fastlane_version < minimum_fastlane_version
      UI.user_error!(
        "Fastlane 2.240.0 or newer is required to renew expired certificates and authenticate with App Store Connect. " \
        "Run `bundle update fastlane` and retry this lane."
      )
    end

    certificates_git_url = resolve_signing_value(
      options: options,
      option_name: :git_url,
      env_name: "GIT_URL",
      prompt: "Certificates repository URL:"
    )
    ENV["GIT_URL"] = normalize_signing_git_url(certificates_git_url)
    developer_team_id = resolve_developer_team_id(options)
    api_authentication = ensure_match_apple_auth!(options)
    ensure_quick_look_app_group!(developer_team_id)
    resolve_signing_value(
      options: options,
      option_name: :match_password,
      env_name: "MATCH_PASSWORD",
      prompt: "Match repository encryption password:",
      sensitive: true
    )
    git_access_token = resolve_git_access_token(options)
    ENV["GIT_ACCESS_TOKEN"] = normalize_git_basic_authorization(git_access_token)
    keychain_password = options[:keychain_password] || ENV["KEYCHAIN_PASSWORD"]
    if keychain_password.nil? || keychain_password.empty?
      keychain_password = SecureRandom.hex(32)
      UI.message("Generated a temporary keychain password for this run")
    end

    keychain_name = "bluewallet_match_#{Process.pid}"
    create_keychain(
      name: keychain_name,
      password: keychain_password,
      default_keychain: false,
      unlock: true,
      timeout: 3600,
      lock_when_sleeps: true
    )

    signing_configurations = [
      {
        platform: "ios",
        app_identifiers: app_identifiers,
        profile_types: %w[development adhoc appstore]
      },
      {
        platform: "catalyst",
        app_identifiers: catalyst_app_identifiers,
        profile_types: %w[development appstore]
      }
    ]

    begin
      signing_configurations.each do |configuration|
        configuration[:profile_types].each do |profile_type|
          UI.message("Checking #{profile_type} signing assets for #{configuration[:platform]}...")
          match_options = {
            type: profile_type,
            platform: configuration[:platform],
            app_identifier: configuration[:app_identifiers],
            readonly: false,
            renew_expired_certs: true,
            force: true,
            git_basic_authorization: ENV["GIT_ACCESS_TOKEN"],
            keychain_name: keychain_name,
            keychain_password: keychain_password,
            team_id: developer_team_id
          }
          if configuration[:platform] == "catalyst" && profile_type == "appstore"
            match_options[:additional_cert_types] = ["mac_installer_distribution"]
          end
          match_options.merge!(api_authentication) unless api_authentication.nil?
          match_options[:username] = ENV["APPLE_ID"] if api_authentication.nil?
          # Do not force --single-branch: Match may need to create or fetch a
          # branch on a first run, where clone_branch_directly would fail.
          match(**match_options)
        end
      end
    ensure
      signing_error = $!
      begin
        delete_keychain(name: keychain_name)
      rescue => cleanup_error
        UI.error("Could not delete temporary keychain #{keychain_name}: #{cleanup_error.message}")
        raise cleanup_error if signing_error.nil?
      end
    end

    log_success("All Apple certificates and provisioning profiles are valid")
  end

  # Only these targets support Mac Catalyst (watch/stickers do not)
  def catalyst_app_identifiers
    [
      "io.bluewallet.bluewallet",
      "io.bluewallet.bluewallet.MarketWidget"
    ]
  end

  desc "Fetch development certificates and provisioning profiles for Mac Catalyst"
  lane :fetch_dev_profiles_catalyst do
    ensure_env_vars(["GIT_URL", "GIT_ACCESS_TOKEN"])
    match(
      git_url: normalize_signing_git_url(ENV["GIT_URL"]),
      git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
      type: "development",
      platform: "catalyst",
      app_identifier: catalyst_app_identifiers,
      readonly: true,
      clone_branch_directly: true
    )
  end

  desc "Fetch App Store certificates and provisioning profiles for Mac Catalyst"
  lane :fetch_appstore_profiles_catalyst do
    ensure_env_vars(["GIT_URL", "GIT_ACCESS_TOKEN"])
    match(
      git_url: normalize_signing_git_url(ENV["GIT_URL"]),
      git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
      type: "appstore",
      platform: "catalyst",
      app_identifier: catalyst_app_identifiers,
      readonly: true,
      clone_branch_directly: true
    )
  end

  desc "Create provisioning profiles for Mac Catalyst (first-time setup)"
  lane :setup_catalyst_provisioning_profiles do
    ensure_env_vars(["GIT_URL", "GIT_ACCESS_TOKEN"])
    catalyst_app_identifiers.each do |app_identifier|
      match(
        git_url: normalize_signing_git_url(ENV["GIT_URL"]),
        git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
        type: "development",
        platform: "catalyst",
        app_identifier: app_identifier,
        readonly: false,
        force_for_new_devices: true,
        clone_branch_directly: true
      )

      match(
        git_url: normalize_signing_git_url(ENV["GIT_URL"]),
        git_basic_authorization: normalize_git_basic_authorization(ENV["GIT_ACCESS_TOKEN"]),
        type: "appstore",
        platform: "catalyst",
        app_identifier: app_identifier,
        readonly: false,
        clone_branch_directly: true
      )
    end
  end

  desc "Delete temporary keychain"
  lane :delete_temp_keychain do |options|
    keychain_name = options[:name] || "temp_keychain"
    UI.message("Deleting temporary keychain #{keychain_name}...")

    keychain_paths = [
      File.expand_path("~/Library/Keychains/#{keychain_name}-db"),
      File.expand_path("~/Library/Keychains/#{keychain_name}.keychain-db")
    ]
    delete_keychain(name: keychain_name) if keychain_paths.any? { |path| File.exist?(path) }

    UI.message("Temporary keychain #{keychain_name} deleted successfully.")
  end
end
