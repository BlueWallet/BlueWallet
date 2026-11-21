def app_store_state_readable(state)
  states = {
    "DEVELOPER_REJECTED" => "Developer Rejected",
    "PREPARE_FOR_SUBMISSION" => "Prepare for Submission",
    "WAITING_FOR_REVIEW" => "Waiting for Review",
    "IN_REVIEW" => "In Review",
    "PENDING_DEVELOPER_RELEASE" => "Pending Developer Release",
    "READY_FOR_SALE" => "Ready for Sale",
    "REJECTED" => "Rejected",
    "METADATA_REJECTED" => "Metadata Rejected"
  }

  states[state] || state
end

desc "Update release notes for App Store versions (iOS or Mac Catalyst)"
lane :release_notes do |options|
  require 'spaceship'
  unless Spaceship::ConnectAPI.token && !Spaceship::ConnectAPI.token.expired?
    authentication = match_api_authentication(options)
    if authentication
      Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.from(
        hash: authentication[:api_key], filepath: authentication[:api_key_path]
      )
    else
      Spaceship::ConnectAPI.login(
        use_portal: false, use_tunes: true, tunes_team_id: ENV['ITC_TEAM_ID']
      )
    end
  end

  app = Spaceship::ConnectAPI::App.find(app_identifiers.first)

  UI.user_error!("Could not find the app with identifier: #{app_identifiers.first}") unless app

  platform_option = options[:platform]

  if platform_option
    platform = case platform_option.to_s.downcase
      when "ios"
        UI.message("Using platform from options: iOS")
        Spaceship::ConnectAPI::Platform::IOS
      when "catalyst", "mac_catalyst", "mac-catalyst"
        UI.message("Using platform from options: Mac Catalyst")
        UI.message("Using Spaceship::ConnectAPI::Platform::MAC_OS for Mac Catalyst")
        Spaceship::ConnectAPI::Platform::MAC_OS
      else
        UI.user_error!("Invalid platform option: #{platform_option}")
      end
  else
    platform_selection = UI.select("Select platform for release notes:", ["iOS", "Mac Catalyst"])

    platform = case platform_selection
      when "iOS"
        UI.message("Selected platform: iOS")
        Spaceship::ConnectAPI::Platform::IOS
      when "Mac Catalyst"
        UI.message("Selected platform: Mac Catalyst")
        UI.message("Using Spaceship::ConnectAPI::Platform::MAC_OS for Mac Catalyst")
        Spaceship::ConnectAPI::Platform::MAC_OS
      else
        UI.user_error!("Invalid platform selection")
      end
  end

  retries = 5
  begin
    rejected_version = nil
    UI.message("Checking for Developer Rejected version for platform: #{platform}")

    begin
      filter = {
        appStoreState: "DEVELOPER_REJECTED",
        platform: platform.to_s
      }

      app.get_app_store_versions(filter: filter).each do |version|
        rejected_version = version
        UI.message("Found rejected version: #{version.version_string}")
        break
      end
    rescue => e
      UI.error("Error fetching Developer Rejected versions: #{e.message}")
      UI.message("Debug info: Platform type: #{platform.class}, Value: #{platform}")
    end

    if rejected_version
      UI.success("Found 'Developer Rejected' version: #{rejected_version.version_string}. This will be the target for updates.")
      prepare_version = rejected_version
    else
      UI.message("No Developer Rejected version found. Checking for version in edit mode or waiting for review...")

      begin
        prepare_version = app.get_edit_app_store_version(platform: platform)
        if prepare_version
          UI.message("Found version in edit mode: #{prepare_version.version_string}")
        else
          UI.message("No version in edit mode found")
        end
      rescue => e
        UI.error("Error fetching edit app store version: #{e.message}")
        prepare_version = nil
      end

      if prepare_version.nil?
        UI.message("Checking for version in Waiting for Review status...")
        begin
          waiting_filter = {
            platform: platform.to_s,
            appStoreState: "WAITING_FOR_REVIEW"
          }

          waiting_versions = app.get_app_store_versions(filter: waiting_filter)
          if waiting_versions && !waiting_versions.empty?
            prepare_version = waiting_versions.first
            UI.success("Found version in Waiting for Review status: #{prepare_version.version_string}")
          else
            UI.message("No version in Waiting for Review status found")
          end
        rescue => e
          UI.error("Error fetching Waiting for Review versions: #{e.message}")
        end
      end

      if prepare_version.nil?
        UI.message("Looking for any in-flight version...")
        begin
          all_versions = app.get_app_store_versions(filter: { platform: platform.to_s })
          UI.message("Found #{all_versions.count} versions for platform #{platform}:")

          all_versions.each do |version|
            state = app_store_state_readable(version.app_store_state)
            UI.message("  - Version: #{version.version_string}, State: #{state}")
          end

          editable_states = ["PREPARE_FOR_SUBMISSION", "WAITING_FOR_REVIEW", "REJECTED", "METADATA_REJECTED", "DEVELOPER_REJECTED"]
          editable_version = all_versions.find { |v| editable_states.include?(v.app_store_state) }

          if editable_version
            prepare_version = editable_version
            UI.success("Using editable version: #{prepare_version.version_string} (#{app_store_state_readable(prepare_version.app_store_state)})")
          elsif all_versions.count > 0
            latest_version = all_versions.sort_by { |v| Gem::Version.new(v.version_string) }.last
            UI.message("Latest version: #{latest_version.version_string} (#{app_store_state_readable(latest_version.app_store_state)})")
          end
        rescue => e
          UI.error("Error listing versions: #{e.message}")
        end
      end

      if prepare_version.nil?
        UI.message("No editable version found.")

        create_new_version = UI.confirm("Would you like to create a new version?")

        if create_new_version
          begin
            require 'json'
            package_json_path = File.join(PROJECT_ROOT, "package.json")
            package_json = JSON.parse(File.read(package_json_path))
            new_version_number = package_json["version"]

            if new_version_number.nil? || new_version_number.strip.empty?
              UI.user_error!("package.json does not contain a valid version")
            end

            UI.message("Using package.json version: #{new_version_number}")
            UI.message("Creating new version: #{new_version_number} for platform: #{platform_selection || platform_option}")
            app.ensure_version!(new_version_number, platform: platform)

            prepare_version = app.get_edit_app_store_version(platform: platform)
            if prepare_version.nil? || prepare_version.version_string != new_version_number
              versions_for_platform = app.get_app_store_versions(filter: { platform: platform.to_s })
              prepare_version = versions_for_platform.find { |v| v.version_string == new_version_number }
            end

            UI.user_error!("Failed to fetch created version #{new_version_number}") if prepare_version.nil?
            UI.message("Created new version: #{new_version_number}")
          rescue => e
            UI.error("Failed to create new version: #{e.message}")
            UI.user_error!("Failed to create version. Make sure your app is configured for Mac Catalyst in App Store Connect.")
          end
        else
          UI.user_error!("No editable version found and user chose not to create one. Aborting.")
        end
      else
        UI.message("Using version #{prepare_version.version_string} in state: #{app_store_state_readable(prepare_version.app_store_state)}")
      end
    end
  rescue => e
    retries -= 1
    if retries > 0
      delay = 20
      UI.message("Cannot find app version info... Retrying after #{delay} seconds (remaining: #{retries})")
      UI.error("Error details: #{e.message}")
      sleep(delay)
      retry
    else
      UI.user_error!("Failed to fetch or create the app version: #{e.message}")
    end
  end

  localized_metadata = prepare_version.get_app_store_version_localizations
  enabled_locales = localized_metadata.map(&:locale)
  release_notes_text = options[:release_notes]

  if release_notes_text.nil? || release_notes_text.strip.empty?
    existing_release_notes = nil

    en_us_localization = localized_metadata.find { |loc| loc.locale == 'en-US' }
    if en_us_localization && en_us_localization.whats_new && !en_us_localization.whats_new.strip.empty?
      existing_release_notes = en_us_localization.whats_new
      UI.success("Found existing release notes in App Store Connect!")
    else
      localized_metadata.each do |loc|
        if loc.whats_new && !loc.whats_new.strip.empty?
          existing_release_notes = loc.whats_new
          UI.success("Found existing release notes in App Store Connect for locale: #{loc.locale}")
          break
        end
      end
    end

    ios_release_notes_path = "metadata/ios/en-US/release_notes.txt"
    project_release_notes_path = "../release-notes.txt"

    ios_notes_exist = File.exist?(ios_release_notes_path)
    project_notes_exist = File.exist?(project_release_notes_path)

    options_list = []

    if existing_release_notes
      options_list << "View/Edit existing App Store notes"
    end

    options_list += [
      "Enter manually",
      "Use clipboard content"
    ]

    if project_notes_exist
      options_list << "Use release-notes.txt file"
    end

    if ios_notes_exist
      options_list << "Use iOS metadata release notes"
    end

    selection = UI.select("Select a source for release notes:", options_list)

    case selection
    when "View/Edit existing App Store notes"
      UI.message("Existing release notes:")
      UI.message("-" * 50)
      UI.message(existing_release_notes)
      UI.message("-" * 50)

      edit_choice = UI.select("Do you want to edit these notes or use as-is?:", [
        "Use as-is",
        "Edit notes"
      ])

      if edit_choice == "Edit notes"
        require 'tempfile'
        temp_file = Tempfile.new('release_notes')
        temp_file.write(existing_release_notes)
        temp_file.close

        editor = ENV['EDITOR'] || 'nano'
        system("#{editor} #{temp_file.path}")

        release_notes_text = File.read(temp_file.path)
        temp_file.unlink

        UI.message("Edited release notes:")
        UI.message("-" * 50)
        UI.message(release_notes_text.length > 500 ? "#{release_notes_text[0..500]}..." : release_notes_text)
        UI.message("-" * 50)

        unless UI.confirm("Use these edited notes?")
          UI.user_error!("User canceled edited notes. Aborting.")
        end
      else
        release_notes_text = existing_release_notes
      end

    when "Enter manually"
      release_notes_text = UI.input("Enter the release notes:")
      if release_notes_text.nil? || release_notes_text.strip.empty?
        UI.user_error!("No release notes provided. Aborting.")
      end

    when "Use clipboard content"
      require 'open3'
      stdout, stderr, status = Open3.capture3("pbpaste")

      if !status.success? || stdout.strip.empty?
        UI.user_error!("Failed to get clipboard content or clipboard is empty")
      end

      UI.message("Clipboard content preview:")
      UI.message("-" * 50)
      UI.message(stdout.length > 500 ? "#{stdout[0..500]}..." : stdout)
      UI.message("-" * 50)

      unless UI.confirm("Use this clipboard content for release notes?")
        UI.user_error!("User canceled clipboard content usage. Aborting.")
      end

      release_notes_text = stdout

    when "Use iOS metadata release notes"
      release_notes_text = File.read(ios_release_notes_path)

      UI.message("iOS metadata release notes preview:")
      UI.message("-" * 50)
      UI.message(release_notes_text.length > 500 ? "#{release_notes_text[0..500]}..." : release_notes_text)
      UI.message("-" * 50)

      unless UI.confirm("Use this content from iOS metadata release notes?")
        UI.user_error!("User canceled file content usage. Aborting.")
      end

    when "Use release-notes.txt file"
      release_notes_path = "../release-notes.txt"

      unless File.exist?(release_notes_path)
        UI.error("Release notes file does not exist at path: #{release_notes_path}")
        UI.user_error!("No release-notes.txt file found. Aborting.")
      end

      release_notes_text = File.read(release_notes_path)

      UI.message("release-notes.txt content preview:")
      UI.message("-" * 50)
      UI.message(release_notes_text.length > 500 ? "#{release_notes_text[0..500]}..." : release_notes_text)
      UI.message("-" * 50)

      unless UI.confirm("Use this content from release-notes.txt?")
        UI.user_error!("User canceled file content usage. Aborting.")
      end
    end
  end

  if release_notes_text.nil? || release_notes_text.strip.empty?
    UI.user_error!("No release notes content available. Aborting.")
  end

  localized_release_notes = {
    'en-US' => release_notes_text,
    'ar-SA' => release_notes_text,
    'zh-Hans' => release_notes_text,
    'hr' => release_notes_text,
    'da' => release_notes_text,
    'nl-NL' => release_notes_text,
    'fi' => release_notes_text,
    'fr-FR' => release_notes_text,
    'de-DE' => release_notes_text,
    'el' => release_notes_text,
    'he' => release_notes_text,
    'hu' => release_notes_text,
    'it' => release_notes_text,
    'ja' => release_notes_text,
    'ms' => release_notes_text,
    'nb' => release_notes_text,
    'no' => release_notes_text,
    'pl' => release_notes_text,
    'pt-BR' => release_notes_text,
    'pt-PT' => release_notes_text,
    'ro' => release_notes_text,
    'ru' => release_notes_text,
    'es-MX' => release_notes_text,
    'es-ES' => release_notes_text,
    'sv' => release_notes_text,
    'th' => release_notes_text,
  }

  if platform == Spaceship::ConnectAPI::Platform::MAC_OS
    UI.message("Mac Catalyst selected - using only en-US localization")
    localized_release_notes = { 'en-US' => release_notes_text }
  end

  localized_release_notes = localized_release_notes.select { |locale, _| enabled_locales.include?(locale) }

  UI.message("Review the following release notes updates:")
  localized_release_notes.each do |locale, notes|
    UI.message("Locale: #{locale} - Notes: #{notes}")
  end

  force_yes = options && options.is_a?(Hash) && options[:force_yes] == true

  unless force_yes
    confirm = UI.confirm("Do you want to proceed with these release notes updates?")
    UI.user_error!("User aborted the lane.") unless confirm
  end

  localized_release_notes.each do |locale, notes|
    app_store_version_localization = localized_metadata.find { |loc| loc.locale == locale }
    if app_store_version_localization
      app_store_version_localization.update(attributes: { "whats_new" => notes })
    else
      UI.error("No localization found for locale #{locale}")
    end
  end
end
