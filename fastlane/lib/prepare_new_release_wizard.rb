module PrepareNewReleaseWizard
  module_function

  def release_notes_enabled_for_scope?(step_by_step_scope)
    step_by_step_scope != 'Build only'
  end

  def needs_build_prompt?(workflow_mode:, step_by_step_scope:, attached_build:)
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
