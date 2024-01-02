source 'https://rubygems.org'

# You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
ruby '>= 2.6.10'

gem 'cocoapods', '>= 1.11.3'
gem 'activesupport', '>= 6.1.7.3', '< 7.1.0'
gem "fastlane"
plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)
