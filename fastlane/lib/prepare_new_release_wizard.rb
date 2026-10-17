module PrepareNewReleaseWizard
  WORKFLOW_CHOICES = [
    'Prepare build and release notes',
    'Select build only',
    'Update release notes only',
    'Review current release',
    'Save status report and exit'
  ].freeze

  module_function

  def workflow_for(choice)
    case choice
    when 'Prepare build and release notes'
      { mode: 'Step by step', scope: 'Build and release notes' }
    when 'Select build only'
      { mode: 'Step by step', scope: 'Build only' }
    when 'Update release notes only'
      { mode: 'Jump to release notes', scope: 'Release notes only' }
    when 'Review current release'
      { mode: 'Jump to review summary', scope: nil }
    when 'Save status report and exit'
      { mode: 'Save progress and exit', scope: nil }
    end
  end

  def release_notes_enabled_for_scope?(step_by_step_scope)
    step_by_step_scope != 'Build only'
  end

  def needs_build_prompt?(workflow_mode:, step_by_step_scope:, attached_build:)
    workflow_mode == 'Jump to build selection' ||
      !(workflow_mode == 'Jump to release notes' || (step_by_step_scope == 'Release notes only' && attached_build))
  end

  def save_prompt_needed_for_scope?(step_by_step_scope)
    step_by_step_scope == 'Build only' || step_by_step_scope == 'Build and release notes'
  end

  def should_exit_without_saving?(next_action)
    next_action == :back || next_action == 'Exit without saving changes'
  end

  def release_notes_source_label(release_notes_option)
    release_notes_option.to_s.strip.empty? ? 'interactive release_notes prompt' : 'release_notes option'
  end
end
