require 'minitest/autorun'
require_relative 'apple_signing_assets'

class AppleSigningAssetsTest < Minitest::Test
  IOS_IDENTIFIERS = %w[app widget stickers].freeze
  CATALYST_IDENTIFIERS = %w[app widget].freeze

  def test_derives_the_signing_repository_only_from_the_canonical_project_remote
    derived_url = AppleSigningAssets.certificates_repository_url(
      project_repository_url: 'https://github.com/BlueWallet/BlueWallet.git'
    )

    assert derived_url.start_with?('https://github.com/BlueWallet/')
    assert derived_url.end_with?('/fastlane.git')
    assert_raises(ArgumentError) do
      AppleSigningAssets.certificates_repository_url(
        project_repository_url: 'https://github.com/example/BlueWallet.git'
      )
    end
  end

  def test_readonly_style_option_can_default_to_true_and_requires_an_explicit_false
    assert AppleSigningAssets.option_enabled?(nil, default: true)
    refute AppleSigningAssets.option_enabled?('false', default: true)
    assert AppleSigningAssets.option_enabled?('true')
    assert AppleSigningAssets.option_enabled?(' YES ')
    refute AppleSigningAssets.option_enabled?('0', default: true)
    assert_raises(ArgumentError) { AppleSigningAssets.option_enabled?('ture', default: true) }
  end

  def test_developer_id_assets_are_checked_first_and_include_the_installer_certificate
    configurations = AppleSigningAssets.configurations(
      ios_identifiers: IOS_IDENTIFIERS,
      catalyst_identifiers: CATALYST_IDENTIFIERS
    )
    developer_id = configurations.first

    assert_equal 'catalyst', developer_id[:platform]
    assert_equal CATALYST_IDENTIFIERS, developer_id[:app_identifiers]
    assert_equal %w[developer_id], developer_id[:profile_types]
    assert_equal ['developer_id_installer'], developer_id[:additional_cert_types]['developer_id']
    assert_equal %w[development appstore], configurations.last[:profile_types]
    assert_equal ['mac_installer_distribution'], configurations.last[:additional_cert_types]['appstore']
  end

  def test_reports_missing_profiles_and_identities
    assert_equal ['widget'], AppleSigningAssets.missing_profiles(
      profile_mapping: { 'app' => 'match Direct app catalyst' },
      expected_identifiers: CATALYST_IDENTIFIERS
    )
    assert_equal ['Developer ID Installer'], AppleSigningAssets.missing_identities(
      identity_output: '1) Developer ID Application: BlueWallet'
    )
  end
end
