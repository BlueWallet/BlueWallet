module AppleBuildNumber
  module_function

  BUILD_UPLOAD_STATES = 'PROCESSING,FAILED,COMPLETE'.freeze
  PAGE_LIMIT = 200

  def project_build_number(project_path:)
    values = File.read(project_path).scan(/CURRENT_PROJECT_VERSION\s*=\s*"?(\d+)"?\s*;/).flatten.map(&:to_i)
    raise ArgumentError, "No CURRENT_PROJECT_VERSION found in #{project_path}" if values.empty?

    values.max.to_s
  end

  def allocation_seed(run_id:, run_attempt:, now: Time.now.to_i)
    return Integer(now.to_s, 10) if run_id.nil? || run_id.to_s.empty?

    (Integer(run_id.to_s, 10) * 100) + Integer(run_attempt.to_s, 10)
  end

  def uploaded_build_numbers(client:, app_id:, version:, platforms:)
    Array(platforms).flat_map do |platform|
      response = client.get_build_uploads(
        app_id: app_id,
        filter: {
          state: BUILD_UPLOAD_STATES,
          cfBundleShortVersionString: version,
          platform: platform
        },
        limit: PAGE_LIMIT
      )

      response.all_pages.flat_map(&:to_models).map(&:cf_build_version)
    end
  end

  def next(high_water_marks:, now: Time.now.to_i)
    marks = Array(high_water_marks).compact.map { |value| Integer(value.to_s, 10) }
    [Integer(now.to_s, 10), marks.max.to_i + 1].max
  end
end
