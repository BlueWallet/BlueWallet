module AppleSigningAssets
  module_function

  REQUIRED_DEVELOPER_ID_IDENTITIES = [
    "Developer ID Application",
    "Developer ID Installer"
  ].freeze

  def certificates_repository_url(project_repository_url:)
    repository_url = project_repository_url.to_s.strip

    case repository_url
    when %r{\Ahttps://github\.com/BlueWallet/BlueWallet(?:\.git)?\z}
      repository_url.sub(%r{/BlueWallet(?:\.git)?\z}, "/fastlane.git")
    when %r{\Agit@github\.com:BlueWallet/BlueWallet(?:\.git)?\z}
      repository_url.sub(%r{/BlueWallet(?:\.git)?\z}, "/fastlane.git")
    else
      raise ArgumentError, "Cannot derive the signing-assets repository from a non-canonical project remote"
    end
  end

  def option_enabled?(value, default: false)
    return default if value.nil?
    return value if value == true || value == false

    normalized_value = value.to_s.strip.downcase
    return true if %w[1 true yes].include?(normalized_value)
    return false if %w[0 false no].include?(normalized_value)

    raise ArgumentError, "Expected a Boolean value, got #{value.inspect}"
  end

  def configurations(ios_identifiers:, catalyst_identifiers:)
    [
      {
        platform: "catalyst",
        app_identifiers: catalyst_identifiers,
        profile_types: %w[developer_id],
        additional_cert_types: {
          "developer_id" => ["developer_id_installer"]
        }
      },
      {
        platform: "ios",
        app_identifiers: ios_identifiers,
        profile_types: %w[development adhoc appstore]
      },
      {
        platform: "catalyst",
        app_identifiers: catalyst_identifiers,
        profile_types: %w[development appstore],
        additional_cert_types: {
          "appstore" => ["mac_installer_distribution"]
        }
      }
    ]
  end

  def missing_profiles(profile_mapping:, expected_identifiers:)
    expected_identifiers.reject do |app_identifier|
      !profile_mapping[app_identifier].to_s.empty?
    end
  end

  def missing_identities(identity_output:)
    REQUIRED_DEVELOPER_ID_IDENTITIES.reject do |identity|
      identity_output.include?(identity)
    end
  end
end
