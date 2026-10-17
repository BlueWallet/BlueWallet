require 'digest'
require 'json'
require 'open3'
require 'yaml'

module CatalystAppCache
  WORKFLOW = '.github/workflows/e2e-catalyst.yml'.freeze
  RUNTIME_FILES = %w[
    config.ts driver.ts suite.ts flows.ts redact.ts globalSetup.ts globalTeardown.ts
    jest.config.js environment.js keyboard.swift README.md
    fixtures/multisig.json fixtures/watch-only.json
  ].map { |file| "tests/e2e-appium/#{file}" }.freeze
  BUILD_STEPS = [
    'Setup Node.js', 'Setup Xcode', 'Set up Ruby', 'Install Node modules',
    'Install CocoaPods dependencies', 'Build Mac Catalyst app'
  ].freeze

  def self.key(entries:, workflow:, toolchain:, profile:)
    sources = entries.reject do |entry|
      file = entry.split("\t", 2).last
      file == WORKFLOW || RUNTIME_FILES.include?(file) || file.start_with?('tests/unit/') ||
        (file.start_with?('tests/e2e-appium/') && file.end_with?('.spec.ts'))
    end
    job = workflow.fetch('jobs').fetch('build')
    # Test selection, retries and job deadlines do not affect the app binary.
    # Keep runner, environment and selected native build steps in the key.
    build = job.select { |name, _| %w[runs-on env].include?(name) }.merge(
      'steps' => job.fetch('steps').select { |step| BUILD_STEPS.include?(step['name']) }
    )
    digest = Digest::SHA256.hexdigest(JSON.generate([sources.sort, build, toolchain, profile]))
    "catalyst-e2e-app-v2-#{digest}"
  end

  def self.command(*args)
    output, status = Open3.capture2(*args)
    raise "Command failed: #{args.first}" unless status.success?
    output.strip
  end
end

if $PROGRAM_NAME == __FILE__
  abort 'The signed app cache is only for GitHub-hosted CI' unless
    ENV['GITHUB_ACTIONS'] == 'true' && ENV['RUNNER_ENVIRONMENT'] == 'github-hosted'
  profile = ENV.fetch('CATALYST_PROFILE_FINGERPRINT')
  abort 'Missing provisioning profile fingerprint' unless profile.match?(/\A[0-9a-f]{64}\z/)
  key = CatalystAppCache.key(
    entries: CatalystAppCache.command('git', 'ls-files', '--stage', '-z').split("\0"),
    workflow: YAML.load_file(CatalystAppCache::WORKFLOW),
    toolchain: [RUBY_VERSION, CatalystAppCache.command('node', '--version'),
                CatalystAppCache.command('xcodebuild', '-version'),
                CatalystAppCache.command('sw_vers', '-productVersion'), CatalystAppCache.command('uname', '-m')],
    profile: profile
  )
  puts "key=#{key}"
end
