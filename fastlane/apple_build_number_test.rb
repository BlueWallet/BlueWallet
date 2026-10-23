require 'minitest/autorun'
require 'tempfile'
require_relative 'apple_build_number'

class AppleBuildNumberTest < Minitest::Test
  def test_reads_the_highest_project_build_number_without_agvtool
    project = Tempfile.new('project.pbxproj')
    project.write(<<~PBXPROJ)
      CURRENT_PROJECT_VERSION = 42;
      CURRENT_PROJECT_VERSION = "43";
    PBXPROJ
    project.close

    assert_equal '43', AppleBuildNumber.project_build_number(project_path: project.path)
  ensure
    project&.unlink
  end

  def test_project_build_number_requires_a_version_setting
    project = Tempfile.new('project.pbxproj')
    project.write('// empty project')
    project.close

    assert_raises(ArgumentError) do
      AppleBuildNumber.project_build_number(project_path: project.path)
    end
  ensure
    project&.unlink
  end

  def test_ci_allocation_seed_is_unique_across_runs_and_attempts
    assert_equal 12_345_01, AppleBuildNumber.allocation_seed(run_id: '12345', run_attempt: '1')
    assert_equal 12_345_02, AppleBuildNumber.allocation_seed(run_id: '12345', run_attempt: '2')
    assert_equal 12_346_01, AppleBuildNumber.allocation_seed(run_id: '12346', run_attempt: '1')
  end

  def test_local_allocation_seed_uses_current_time
    assert_equal 123, AppleBuildNumber.allocation_seed(run_id: nil, run_attempt: nil, now: 123)
  end

  BuildUpload = Struct.new(:cf_build_version)
  Page = Struct.new(:models) do
    def to_models
      models
    end
  end

  class Response
    def initialize(pages)
      @pages = pages
    end

    def all_pages
      @pages
    end
  end

  class Client
    attr_reader :queries

    def initialize(responses)
      @responses = responses
      @queries = []
    end

    def get_build_uploads(**query)
      @queries << query
      @responses.fetch(query.fetch(:filter).fetch(:platform))
    end
  end

  def test_clears_the_existing_catalyst_high_water_mark
    assert_equal 1_903_280_000, AppleBuildNumber.next(
      high_water_marks: [1_792_630_709, '1903279999'],
      now: 1_792_630_710
    )
  end

  def test_uses_the_current_time_when_it_is_newer
    assert_equal 2_000_000_000, AppleBuildNumber.next(
      high_water_marks: [1_903_279_999],
      now: '2000000000'
    )
  end

  def test_handles_missing_high_water_marks
    assert_equal 1_792_630_710, AppleBuildNumber.next(
      high_water_marks: [],
      now: 1_792_630_710
    )
  end

  def test_rejects_non_numeric_values
    assert_raises(ArgumentError) do
      AppleBuildNumber.next(high_water_marks: ['not-a-build-number'], now: 1_792_630_710)
    end
  end

  def test_pages_every_platform_and_returns_every_uploaded_build_number
    client = Client.new(
      'IOS' => Response.new([
        Page.new([BuildUpload.new('1903280000')]),
        Page.new([BuildUpload.new('1903999999')])
      ]),
      'MAC_OS' => Response.new([
        Page.new([BuildUpload.new('1903280500')])
      ])
    )

    builds = AppleBuildNumber.uploaded_build_numbers(
      client: client,
      app_id: 'app-id',
      version: '8.0.4',
      platforms: %w[IOS MAC_OS]
    )

    assert_equal %w[1903280000 1903999999 1903280500], builds
    assert_equal %w[IOS MAC_OS], client.queries.map { |query| query[:filter][:platform] }
    assert client.queries.all? { |query| query[:limit] == 200 }
    assert client.queries.all? { |query| query[:filter][:cfBundleShortVersionString] == '8.0.4' }
  end
end
