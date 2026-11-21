platform :ios do
  desc "Build a Mac Catalyst app and create a local DMG"
  lane :build_catalyst_app_lane do
    archive_catalyst
    create_catalyst_dmg
  end

  desc "Build a Mac Catalyst archive for TestFlight"
  lane :archive_catalyst do
    Dir.chdir(PROJECT_ROOT) do
      UI.message("Building Mac Catalyst application from: #{Dir.pwd}")

      ENV['GIT_URL'] = normalize_signing_git_url(ENV['GIT_URL']) unless ENV['GIT_URL'].to_s.empty?
      ENV['GIT_ACCESS_TOKEN'] = normalize_git_basic_authorization(ENV['GIT_ACCESS_TOKEN']) unless ENV['GIT_ACCESS_TOKEN'].to_s.empty?

      workspace_path = File.join(PROJECT_ROOT, "ios", "BlueWallet.xcworkspace")
      derived_data_path = File.join(PROJECT_ROOT, "ios", "build", "catalyst-derived-data")
      output_dir = File.join(PROJECT_ROOT, "ios", "build", "catalyst-output")

      if ENV['SKIP_CLEAR_DERIVED_DATA'] == '1'
        UI.message('Skipping clear_derived_data_lane (SKIP_CLEAR_DERIVED_DATA=1)')
      else
        clear_derived_data_lane
      end
      FileUtils.mkdir_p(derived_data_path)
      FileUtils.mkdir_p(output_dir)

      has_signing_creds = ENV['CATALYST_SIGNING_IDENTITY'] && !ENV['CATALYST_SIGNING_IDENTITY'].empty? &&
                          ENV['CATALYST_TEAM_ID'] && !ENV['CATALYST_TEAM_ID'].empty?
      has_match_creds = ENV['GIT_URL'] && !ENV['GIT_URL'].empty? &&
                        ENV['GIT_ACCESS_TOKEN'] && !ENV['GIT_ACCESS_TOKEN'].empty?
      should_sign = has_signing_creds && has_match_creds && ENV['CATALYST_SKIP_CODESIGNING'] != '1'
      signing_identity = ENV['CATALYST_SIGNING_IDENTITY'] || "Apple Distribution"

      xcargs_str = "ARCHS=arm64 ONLY_ACTIVE_ARCH=YES"
      if should_sign
        UI.message("Setting up Mac Catalyst provisioning profiles via match...")
        team_id = ENV['CATALYST_TEAM_ID']
        match_readonly = ENV['MATCH_READONLY'] != 'false'

        match(
          type: "appstore",
          platform: "catalyst",
          additional_cert_types: ["mac_installer_distribution"],
          app_identifier: catalyst_app_identifiers,
          team_id: team_id,
          git_url: ENV['GIT_URL'],
          git_basic_authorization: ENV['GIT_ACCESS_TOKEN'],
          readonly: match_readonly,
          clone_branch_directly: true,
          keychain_name: ENV['KEYCHAIN_NAME'] || "login",
          keychain_password: ENV['KEYCHAIN_PASSWORD'] || ""
        )

        xcargs_str += " DEVELOPMENT_TEAM=#{team_id}"
        xcargs_str += " CODE_SIGN_IDENTITY=\"#{signing_identity}\""
        xcargs_str += " CODE_SIGN_STYLE=Manual"

        # Set provisioning profile specifiers per catalyst target
        catalyst_app_identifiers.each do |app_id|
          profile_name = "match AppStore #{app_id} catalyst"
          # Convert bundle ID to xcodebuild target setting key
          # e.g., io.bluewallet.bluewallet -> PROVISIONING_PROFILE_SPECIFIER for that target
          xcargs_str += " PROVISIONING_PROFILE_SPECIFIER_#{app_id.gsub('.', '_')}=\"#{profile_name}\""
        end

        UI.success("Provisioning profiles configured for Mac Catalyst")
      else
        # Disable code signing entirely so xcodebuild doesn't look for provisioning profiles
        xcargs_str += " CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO"
        UI.message("No signing credentials provided — building without code signing")
      end

      archive_path = File.join(output_dir, "BlueWallet-#{SecureRandom.hex(8)}.xcarchive")
      build_app(
        archive_path: archive_path,
        scheme: "BlueWallet",
        workspace: workspace_path,
        configuration: "Release",
        destination: "generic/platform=macOS,variant=Mac Catalyst",
        xcargs: xcargs_str,
        clean: true,
        skip_codesigning: !should_sign,
        skip_package_ipa: true,
        derived_data_path: derived_data_path,
        buildlog_path: File.join(PROJECT_ROOT, "ios", "build_logs")
      )

      UI.user_error!("Mac Catalyst archive was not found at #{archive_path}") unless File.directory?(archive_path)

      archived_app = File.join(archive_path, "Products/Applications/BlueWallet.app")
      sandboxed_executables = [
        File.join(archived_app, "Contents/MacOS/BlueWallet"),
        File.join(archived_app, "Contents/PlugIns/WidgetsExtension.appex/Contents/MacOS/WidgetsExtension")
      ]
      sandboxed_executables.each do |executable|
        next unless should_sign
        UI.user_error!("Signed Catalyst executable not found at #{executable}") unless File.file?(executable)
        entitlements = sh("codesign", "-d", "--entitlements", ":-", executable, log: false)
        unless entitlements.match?(%r{<key>com\.apple\.security\.app-sandbox</key>\s*<true\s*/>})
          UI.user_error!("App Sandbox entitlement is missing from #{executable}")
        end
      end
      UI.success("Verified App Sandbox entitlement on the Catalyst app and widget archive") if should_sign

      UI.user_error!("Mac Catalyst app was not found at #{archived_app}") unless File.directory?(archived_app)
      sh("codesign", "--verify", "--deep", "--strict", archived_app) if should_sign

      ENV['CATALYST_ARCHIVE_PATH'] = archive_path
      ENV['CATALYST_APP_PATH'] = archived_app
      write_github_output(catalyst_archive_path: archive_path, catalyst_app_path: archived_app)
      UI.success("macOS app archived at: #{archive_path}")
    end
  end

  private_lane :create_catalyst_dmg do
    output_dir = File.join(PROJECT_ROOT, "ios", "build", "catalyst-output")
    dmg_path = File.join(output_dir, "BlueWallet-Mac-Catalyst.dmg")
    Dir.mktmpdir("dmg-staging", output_dir) do |staging|
      FileUtils.cp_r(ENV.fetch('CATALYST_APP_PATH'), staging)
      FileUtils.ln_s("/Applications", File.join(staging, "Applications"))
      FileUtils.cp(File.join(PROJECT_ROOT, "fastlane", "templates", "catalyst-dmg-readme.txt"),
                   File.join(staging, "README - Read Before Opening.txt"))
      sh("hdiutil", "create", "-volname", "BlueWallet", "-srcfolder", staging, "-ov", "-format", "UDZO", dmg_path)
    end
    UI.user_error!("DMG was not created at #{dmg_path}") unless File.file?(dmg_path)
    ENV['CATALYST_DMG_PATH'] = dmg_path
    write_github_output(catalyst_dmg_path: dmg_path)
    UI.success("macOS DMG at: #{dmg_path}")
  end

  desc "Upload Mac Catalyst app to TestFlight"
  lane :upload_catalyst_to_testflight do
    Dir.chdir(PROJECT_ROOT) do
      archive_path = ENV['CATALYST_ARCHIVE_PATH']
      UI.user_error!("No xcarchive found for TestFlight upload") if archive_path.nil? || !File.exist?(archive_path)
      UI.message("Using archive: #{archive_path}")

      output_dir = File.join(PROJECT_ROOT, "ios", "build", "catalyst-output")
      FileUtils.mkdir_p(output_dir)

      # The archive already has the validated App Store signatures and
      # entitlements. Package it without modifying either executable signature.
      archived_app = File.join(archive_path, "Products/Applications/BlueWallet.app")
      UI.user_error!("No signed Catalyst app found in #{archive_path}") unless File.directory?(archived_app)
      [archived_app, File.join(archived_app, "Contents/PlugIns/WidgetsExtension.appex")].each do |bundle|
        sh("codesign", "--verify", "--strict", bundle)
        entitlements = sh("codesign", "-d", "--entitlements", ":-", bundle, log: false)
        unless entitlements.match?(%r{<key>com\.apple\.security\.app-sandbox</key>\s*<true\s*/>})
          UI.user_error!("App Sandbox entitlement is missing immediately before packaging #{bundle}")
        end
      end
      pkg_path = File.join(output_dir, "BlueWallet.pkg")
      FileUtils.rm_f(pkg_path)
      installer_identity = ENV['CATALYST_INSTALLER_SIGNING_IDENTITY'] || "3rd Party Mac Developer Installer"
      sh("productbuild",
         "--component", archived_app, "/Applications",
         "--sign", installer_identity,
         pkg_path)
      sh("pkgutil", "--check-signature", pkg_path)
      UI.success("Packaged signed Catalyst app: #{pkg_path}")

      upload_apple_testflight(
        platform: "catalyst",
        artifact_path: pkg_path
      )

      UI.success("Mac Catalyst build finished processing in TestFlight!")
    end
  end
end
