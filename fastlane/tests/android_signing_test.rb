require 'minitest/autorun'
require 'tmpdir'
require 'fileutils'
require 'json'
require 'shellwords'
require 'uri'

# Load only the helpers, without evaluating or authenticating Fastlane lanes.
source = File.read(File.expand_path('../Fastfile', __dir__))
PROJECT_ROOT = File.expand_path('../..', __dir__)
ANDROID_SIGNING_SHA256 = source[/ANDROID_SIGNING_SHA256 = '([^']+)'/, 1]
eval(source[/module AndroidHelpers\n.*?^end\n/m], TOPLEVEL_BINDING)

module UI
  def self.user_error!(message)
    raise message
  end
end

module Actions
  class << self
    attr_accessor :handler
    def sh(command)
      handler.call(command)
    end
  end
end

class AndroidSigningTest < Minitest::Test
  def test_rejects_unsafe_repository_urls_before_running_commands
    saved = ENV.to_h
    ENV.update('GIT_ACCESS_TOKEN' => 'fixture', 'ANDROID_SIGNING_DECRYPTION_PASSWORD' => 'fixture', 'KEYSTORE_PASSWORD' => 'fixture')
    Actions.handler = ->(_) { flunk 'Unsafe URL reached an external command' }
    ['http://example.com/repo', 'https://user:password@example.com/repo'].each do |url|
      ENV['GIT_URL'] = url
      error = assert_raises(RuntimeError) { AndroidHelpers.with_play_signing_materials { flunk 'Unsafe URL reached build' } }
      assert_match(/HTTPS Match repository URL/, error.message)
    end
  ensure
    ENV.replace(saved)
  end

  def test_signing_failures_stop_build_and_remove_temporary_material
    saved = ENV.to_h
    ENV.update('GIT_URL' => 'https://example.com/signing.git', 'GIT_ACCESS_TOKEN' => 'fixture-token',
               'ANDROID_SIGNING_DECRYPTION_PASSWORD' => 'fixture-decryption', 'KEYSTORE_PASSWORD' => 'fixture-store')
    [:clone, :decrypt, :manifest, :certificate].each do |failure|
      temporary_root = nil
      Actions.handler = lambda do |command|
        refute_includes command, 'fixture-token'
        refute_includes command, 'fixture-decryption'
        refute_includes command, 'fixture-store'
        if command.include?('git clone')
          parts = Shellwords.split(command)
          repo = parts.last
          temporary_root = File.dirname(repo)
          helper = parts.find { |part| part.start_with?('GIT_ASKPASS=') }.split('=', 2).last
          assert_equal 0o700, File.stat(helper).mode & 0o777
          assert_includes File.read(helper), '$GIT_ACCESS_TOKEN'
          assert_includes command, 'GIT_TERMINAL_PROMPT=0'
          raise 'clone failed' if failure == :clone
          FileUtils.mkdir_p(File.join(repo, 'android'))
          File.write(File.join(repo, 'android/bluewallet-upload.jks.enc'), 'fixture')
          File.write(File.join(repo, 'android/signing-manifest.json'), JSON.generate(
            applicationId: 'io.bluewallet.bluewallet', keyAlias: 'test',
            sha256: failure == :manifest ? 'A' * 64 : ANDROID_SIGNING_SHA256))
        elsif command.start_with?('openssl')
          assert_includes command, '-pbkdf2 -iter 600000'
          assert_includes command, '-pass env:ANDROID_SIGNING_DECRYPTION_PASSWORD'
          raise 'decrypt failed' if failure == :decrypt
        elsif command.start_with?('keytool')
          assert_includes command, '-storepass:env KEYSTORE_PASSWORD'
          "SHA256: #{'A' * 64}"
        else
          flunk "Unexpected external command: #{command}"
        end
      end
      error = assert_raises(RuntimeError) { AndroidHelpers.with_play_signing_materials { flunk 'Invalid signing material reached build' } }
      expected = { clone: /clone failed/, decrypt: /decrypt failed/, manifest: /pinned Android signing certificate/, certificate: /does not match signing-manifest/ }
      assert_match expected.fetch(failure), error.message
      refute Dir.exist?(temporary_root)
    end
  ensure
    ENV.replace(saved)
  end

  def test_unsigned_apk_is_never_selected
    Dir.mktmpdir do |dir|
      File.write(File.join(dir, 'app-release-unsigned.apk'), 'unsigned')
      paths = { gradle_signed: File.join(dir, 'app-release.apk'), signed: File.join(dir, 'release.apk') }
      assert_raises(RuntimeError) { AndroidHelpers.finalize_apk!(paths) }
      File.write(paths[:gradle_signed], 'signed')
      AndroidHelpers.finalize_apk!(paths)
      assert_equal 'signed', File.read(paths[:signed])
    end
  end

  def test_rejects_wrong_or_missing_apk_certificate
    AndroidHelpers.stub(:apksigner_path, '/sdk/apksigner') do
      Actions.handler = ->(_) { "Signer #1 certificate SHA-256 digest: #{'A' * 64}" }
      assert_raises(RuntimeError) { AndroidHelpers.verify_apk!('/tmp/app.apk', ANDROID_SIGNING_SHA256) }
      Actions.handler = ->(_) { 'No certificate' }
      assert_raises(RuntimeError) { AndroidHelpers.verify_apk!('/tmp/app.apk', ANDROID_SIGNING_SHA256) }
      Actions.handler = ->(_) { "Signer #1 certificate SHA-256 digest: #{ANDROID_SIGNING_SHA256.downcase}" }
      AndroidHelpers.verify_apk!('/tmp/app.apk', ANDROID_SIGNING_SHA256)
    end
  end

  def test_cleanup_and_credentials_restored_when_build_fails
    saved = ENV.to_h
    temporary_root = nil
    ENV.update('GIT_URL' => 'https://example.com/signing.git', 'GIT_ACCESS_TOKEN' => 'test-token',
               'ANDROID_SIGNING_DECRYPTION_PASSWORD' => 'test-decryption', 'KEYSTORE_PASSWORD' => 'test-store')
    Actions.handler = lambda do |command|
      if command.include?('git clone')
        repo = Shellwords.split(command).last
        temporary_root = File.dirname(repo)
        FileUtils.mkdir_p(File.join(repo, 'android'))
        File.write(File.join(repo, 'android/bluewallet-upload.jks.enc'), 'test fixture')
        File.write(File.join(repo, 'android/signing-manifest.json'), JSON.generate(
          applicationId: 'io.bluewallet.bluewallet', keyAlias: 'test', sha256: ANDROID_SIGNING_SHA256))
      elsif command.start_with?('keytool')
        "SHA256: #{ANDROID_SIGNING_SHA256}"
      else
        ''
      end
    end
    error = assert_raises(RuntimeError) do
      AndroidHelpers.with_play_signing_materials do
        assert_nil ENV['GIT_ACCESS_TOKEN']
        assert_nil ENV['ANDROID_SIGNING_DECRYPTION_PASSWORD']
        raise 'build failed'
      end
    end
    assert_equal 'build failed', error.message
    refute Dir.exist?(temporary_root)
    assert_equal 'test-token', ENV['GIT_ACCESS_TOKEN']
    assert_equal 'test-decryption', ENV['ANDROID_SIGNING_DECRYPTION_PASSWORD']
  ensure
    ENV.replace(saved)
  end
end
