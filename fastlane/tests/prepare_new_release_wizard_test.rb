require 'minitest/autorun'
require_relative '../lib/prepare_new_release_wizard'

class PrepareNewReleaseWizardTest < Minitest::Test
  def test_workflow_choices_map_to_clear_internal_states
    assert_equal(
      { mode: 'Step by step', scope: 'Build and release notes' },
      PrepareNewReleaseWizard.workflow_for('Prepare build and release notes')
    )
    assert_equal(
      { mode: 'Step by step', scope: 'Build only' },
      PrepareNewReleaseWizard.workflow_for('Select build only')
    )
    assert_equal(
      { mode: 'Jump to release notes', scope: 'Release notes only' },
      PrepareNewReleaseWizard.workflow_for('Update release notes only')
    )
    assert_equal(
      { mode: 'Jump to review summary', scope: nil },
      PrepareNewReleaseWizard.workflow_for('Review current release')
    )
    assert_equal(
      { mode: 'Save progress and exit', scope: nil },
      PrepareNewReleaseWizard.workflow_for('Save status report and exit')
    )
  end

  def test_release_notes_disabled_for_build_only
    assert_equal(false, PrepareNewReleaseWizard.release_notes_enabled_for_scope?('Build only'))
  end

  def test_release_notes_enabled_for_other_scopes
    assert_equal(true, PrepareNewReleaseWizard.release_notes_enabled_for_scope?('Build and release notes'))
    assert_equal(true, PrepareNewReleaseWizard.release_notes_enabled_for_scope?('Release notes only'))
  end

  def test_needs_build_prompt_for_step_by_step
    assert_equal(true, PrepareNewReleaseWizard.needs_build_prompt?(
      workflow_mode: 'Step by step',
      step_by_step_scope: 'Build and release notes',
      attached_build: nil
    ))
  end

  def test_skips_build_prompt_when_jump_to_release_notes
    assert_equal(false, PrepareNewReleaseWizard.needs_build_prompt?(
      workflow_mode: 'Jump to release notes',
      step_by_step_scope: 'Release notes only',
      attached_build: Object.new
    ))
  end

  def test_skips_build_prompt_when_release_notes_only_has_attached_build
    assert_equal(false, PrepareNewReleaseWizard.needs_build_prompt?(
      workflow_mode: 'Step by step',
      step_by_step_scope: 'Release notes only',
      attached_build: Object.new
    ))
  end

  def test_back_from_release_notes_forces_build_prompt
    assert_equal(true, PrepareNewReleaseWizard.needs_build_prompt?(
      workflow_mode: 'Jump to build selection',
      step_by_step_scope: 'Release notes only',
      attached_build: Object.new
    ))
  end

  def test_save_prompt_required_for_build_scope_only
    assert_equal(true, PrepareNewReleaseWizard.save_prompt_needed_for_scope?('Build only'))
    assert_equal(true, PrepareNewReleaseWizard.save_prompt_needed_for_scope?('Build and release notes'))
    assert_equal(false, PrepareNewReleaseWizard.save_prompt_needed_for_scope?('Release notes only'))
  end

  def test_exit_without_saving_choices
    assert_equal(true, PrepareNewReleaseWizard.should_exit_without_saving?(:back))
    assert_equal(true, PrepareNewReleaseWizard.should_exit_without_saving?('Exit without saving changes'))
    assert_equal(false, PrepareNewReleaseWizard.should_exit_without_saving?('Submit for App Store review'))
  end

  def test_release_notes_source_label
    assert_equal('interactive release_notes prompt', PrepareNewReleaseWizard.release_notes_source_label(nil))
    assert_equal('interactive release_notes prompt', PrepareNewReleaseWizard.release_notes_source_label('  '))
    assert_equal('release_notes option', PrepareNewReleaseWizard.release_notes_source_label('manual note'))
  end
end
