SHARED_BUILD_NUMBER_MAX = 2_100_000_000

module AndroidHelpers
  module_function

  def require_env!(keys)
    missing = Array(keys).select { |key| ENV[key].nil? || ENV[key].empty? }
    UI.user_error!("Missing required env vars: #{missing.join(', ')}") unless missing.empty?
  end

  def project_root
    PROJECT_ROOT
  end

  def write_keystore_from_hex!(hex_value, path)
    hex = hex_value.to_s.gsub(/\s/, '')
    UI.user_error!("KEYSTORE_FILE_HEX is not valid hexadecimal") unless hex.match?(/\A(?:[0-9a-fA-F]{2})+\z/)
    File.binwrite(path, [hex].pack('H*'))
  end

  def version_name
    build_gradle_path = File.join(project_root, 'android', 'app', 'build.gradle')
    version = File.read(build_gradle_path)[/versionName\s+"([^"]+)"/, 1]
    UI.user_error!("Failed to extract versionName from #{build_gradle_path}") if version.nil?
    version
  end

  def branch_name
    raw = ENV['GITHUB_HEAD_REF'] || ENV['GITHUB_REF_NAME'] || Actions.sh('git', '-C', project_root, 'rev-parse', '--abbrev-ref', 'HEAD', log: false).strip
    sanitized = raw.to_s.gsub(/[^a-zA-Z0-9_-]/, '_')
    sanitized.empty? ? 'master' : sanitized
  end

  def apk_name(version_name, build_number, branch)
    branch != 'master' ? "BlueWallet-#{version_name}-#{build_number}-#{branch}.apk" : "BlueWallet-#{version_name}-#{build_number}.apk"
  end

  def apksigner_path
    sdk_root = ENV['ANDROID_HOME'] || ENV['ANDROID_SDK_ROOT']
    Dir.glob(File.join(sdk_root.to_s, 'build-tools', '*', 'apksigner')).sort.last
  end

  def resolve_apk_paths(version_name:, build_number:, branch_name:)
    apk_dir = File.join(project_root, 'android', 'app', 'build', 'outputs', 'apk', 'release')
    unsigned = File.join(apk_dir, 'app-release-unsigned.apk')
    fallback = File.join(apk_dir, 'app-release.apk')
    signed = File.join(apk_dir, apk_name(version_name, build_number, branch_name))
    { unsigned: unsigned, fallback: fallback, signed: signed }
  end

  def unsigned_apk!(paths)
    candidate = File.exist?(paths[:unsigned]) ? paths[:unsigned] : paths[:fallback]
    UI.user_error!("Unsigned APK not found at path: #{paths[:unsigned]} or #{paths[:fallback]}") unless File.exist?(candidate)
    candidate
  end

  def sign_apk!(apk_path, keystore_path)
    signer = apksigner_path
    UI.user_error!("apksigner not found in Android build-tools") if signer.nil? || signer.empty?
    Actions.sh(signer, 'sign', '--ks', keystore_path, '--ks-pass', 'env:KEYSTORE_PASSWORD', apk_path)
  end

  def generate_temp_keystore!(path, password)
    Actions.sh(
      'keytool', '-genkeypair', '-keystore', path, '-storepass:env', password,
      '-keypass:env', password, '-alias', 'bluewallet-temp', '-keyalg', 'RSA',
      '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Temp,O=BlueWallet,OU=CI,L=NY,ST=NY,C=US'
    )
  end
end

platform :android do
  private_lane :assemble_release do |options|
    gradle(
      task: 'assemble',
      build_type: 'Release',
      project_dir: File.join(PROJECT_ROOT, 'android'),
      properties: { 'bluewalletVersionCode' => options[:build_number] },
      flags: '--no-daemon --stacktrace --console=plain'
    )
  end

  desc "Prepare the keystore file"
  lane :prepare_keystore do
    path = File.join(PROJECT_ROOT, 'android', 'bluewallet-release-key.keystore')
    AndroidHelpers.write_keystore_from_hex!(ENV['KEYSTORE_FILE_HEX'], path)
    UI.message("Keystore created successfully.")
  end

  desc "Update version, build number, and sign APK"
  lane :update_version_build_and_sign_apk do |options|
    build_release_apk(options)
  end

  desc "Build and sign release APK"
  lane :build_release_apk do |options|
    build_number = (options[:build_number] || ENV['BUILD_NUMBER']).to_s
    UI.user_error!("A build_number option or BUILD_NUMBER environment variable is required") if build_number.empty?
    UI.user_error!("Shared build number must contain digits only") unless build_number.match?(/\A\d+\z/)
    UI.user_error!("Shared build number must be positive") if build_number.to_i.zero?
    UI.user_error!("Shared build number exceeds Android's #{SHARED_BUILD_NUMBER_MAX} limit") if build_number.to_i > SHARED_BUILD_NUMBER_MAX

    version_name = AndroidHelpers.version_name
    apk_paths = AndroidHelpers.resolve_apk_paths(
      version_name: version_name, build_number: build_number, branch_name: AndroidHelpers.branch_name
    )

    original_password = ENV['KEYSTORE_PASSWORD']
    begin
      Dir.mktmpdir('bw-release-keystore') do |dir|
        keystore_path = File.join(dir, 'release.keystore')
        if options[:auto_credentials]
          ENV['KEYSTORE_PASSWORD'] = SecureRandom.hex(16)
          AndroidHelpers.generate_temp_keystore!(keystore_path, 'KEYSTORE_PASSWORD')
        else
          AndroidHelpers.require_env!(%w[KEYSTORE_FILE_HEX KEYSTORE_PASSWORD])
          AndroidHelpers.write_keystore_from_hex!(ENV['KEYSTORE_FILE_HEX'], keystore_path)
        end

        assemble_release(build_number: build_number)
        unsigned_apk = AndroidHelpers.unsigned_apk!(apk_paths)
        AndroidHelpers.sign_apk!(unsigned_apk, keystore_path)
        FileUtils.mv(unsigned_apk, apk_paths.fetch(:signed))
      end
    ensure
      ENV['KEYSTORE_PASSWORD'] = original_password
    end

    apk_path = apk_paths.fetch(:signed)
    ENV['APK_OUTPUT_PATH'] = apk_path
    ENV['APK_VERSION_NAME'] = version_name
    ENV['APK_VERSION_CODE'] = build_number
    write_github_output(
      apk_output_path: apk_path, apk_filename: File.basename(apk_path),
      apk_version_name: version_name, apk_version_code: build_number
    )
    UI.success("APK signed successfully: #{apk_path}")
  end

  desc "Upload an APK to BrowserStack App Live"
  lane :upload_to_browserstack do
    apk_path = ENV['APK_PATH'].to_s
    apk_path = File.expand_path(apk_path, PROJECT_ROOT)
    UI.user_error!("Set APK_PATH to an existing APK") unless File.extname(apk_path) == '.apk' && File.file?(apk_path)

    upload_to_browserstack_app_live(
      file_path: apk_path,
      browserstack_username: ENV['BROWSERSTACK_USERNAME'],
      browserstack_access_key: ENV['BROWSERSTACK_ACCESS_KEY']
    )

    app_url = ENV['BROWSERSTACK_LIVE_APP_ID'].to_s
    UI.user_error!("BrowserStack upload failed, no app URL returned") unless app_url.start_with?('bs://')
    write_github_output(browserstack_app_url: app_url)
    app_url
  end

  desc "Compatibility entry point for uploading an APK to BrowserStack"
  lane :upload_to_browserstack_and_comment do
    UI.important("Use upload_to_browserstack. The release workflow now posts PR comments.")
    upload_to_browserstack
  end
end
