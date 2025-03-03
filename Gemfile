source "https://rubygems.org"

# You may use http://rbenv.org/ or https://rvm.io/ to install and use this version
ruby "3.1.6"
gem 'rubyzip', '2.4.1'
gem 'cocoapods', '~> 1.14.3'
gem 'activesupport', '>= 6.1.7.5', '!= 7.1.0'
gem "fastlane", "~> 2.226.0"
gem 'xcodeproj', '< 1.26.0'
gem 'concurrent-ruby', '< 1.3.4'

# Required for App Store Connect API
gem "jwt"

plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)
