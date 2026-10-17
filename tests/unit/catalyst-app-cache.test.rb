require 'yaml'
require_relative '../e2e-appium/app-cache-key'

workflow = YAML.load_file(File.expand_path('../../.github/workflows/e2e-catalyst.yml', __dir__))
entries = [
  "100644 application-v1 0\tscreen/wallets/add.tsx",
  "100644 dependencies-v1 0\tpackage-lock.json",
  "100644 adapter-v1 0\ttests/e2e-appium/preferences.ts",
  "100644 helper-v1 0\ttests/e2e-appium/driver.ts",
  "100644 case-v1 0\ttests/e2e-appium/bluewallet.spec.ts",
  "100644 unit-v1 0\ttests/unit/catalyst-secrets.test.ts"
]
options = { entries: entries, workflow: workflow, toolchain: ['Xcode test'], profile: 'a' * 64 }
baseline = CatalystAppCache.key(**options)

def check(label, condition)
  raise label unless condition
end

runtime_changed = entries.map { |entry| entry.sub(/(helper|case|unit)-v1/, '\1-v2') }
check('test-only changes must reuse the app', CatalystAppCache.key(**options.merge(entries: runtime_changed)) == baseline)

%w[application dependencies adapter].each do |input|
  changed = entries.map { |entry| entry.sub("#{input}-v1", "#{input}-v2") }
  check("#{input} changes must rebuild", CatalystAppCache.key(**options.merge(entries: changed)) != baseline)
end

changed_workflow = Marshal.load(Marshal.dump(workflow))
changed_workflow.fetch('jobs').fetch('test')['timeout-minutes'] = 99
test_step = changed_workflow.fetch('jobs').fetch('test').fetch('steps').find { |step| step['name'] == 'Run Appium tests' }
test_step.fetch('env')['E2E_RETRIES'] = '0'
changed_workflow.fetch('jobs').fetch('build')['timeout-minutes'] = 99
check('test settings and deadlines must not rebuild', CatalystAppCache.key(**options.merge(workflow: changed_workflow)) == baseline)

build_step = changed_workflow.fetch('jobs').fetch('build').fetch('steps').find { |step| step['name'] == 'Build Mac Catalyst app' }
build_step['run'] += "\necho changed build input\n"
check('native build commands must rebuild', CatalystAppCache.key(**options.merge(workflow: changed_workflow)) != baseline)
check('toolchain changes must rebuild', CatalystAppCache.key(**options.merge(toolchain: ['Xcode other'])) != baseline)
check('profile changes must rebuild', CatalystAppCache.key(**options.merge(profile: 'b' * 64)) != baseline)
puts 'Catalyst app cache invalidation checks passed'
