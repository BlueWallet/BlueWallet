# How to make a release

## Apple

* test the build on real device. its imperative that you run selftest and it gives you OK
* if necessary, up version number in all relevant files (you can use `./edit-version-number.sh`)
* run `./release-notes.sh` - it prints changelog between latest tag and now, put this output under 
new version in file `ios/fastlane/metadata/en-US/release_notes.txt` (on top); if file got too big 
delete the oldest version from the bottom of the file
* now is a good time to commit ver bump and release notes changes
* create this release version in App Store Connect (iTunes) and attach appropriate build. note 
last 4 digits of the build and announce it - this is now a RC. no need to fill release notes yet 
* `cd ios/` and then  run `DELIVER_USERNAME="my_itunes_email@example.com" DELIVER_PASSWORD="my_itunes_password" fastlane deliver --force  --skip_binary_upload --skip_screenshots --ignore_language_directory_validation -a io.bluewallet.bluewallet --app_version "6.6.6"`
but replace `6.6.6` with your version number - this will upload release notes to all locales in itunes
* go back to App Store Connect and press `Submit for Review`. choose Yes, we use identifiers - for installs tracking 
* once its approved and released it is safe to cut a release tag: run `git tag -m "REL v6.6.6: 76ed479" v6.6.6` 
where `76ed479` is a latest commit in this version. replace the version as well. then run `git push origin --tags`
* you are awesome!

## Android

* do android after ios usually
* test the build on real device. its imperative that you run selftest and it gives you OK. note which build you are testing
* go to appcenter.ms, find this exact build under `master` builds, and press `Distribute` -> `Store` -> `Production`. 
in `Release notes` write `Bug fixes and performance improvements`, this field is to small to include actual changelog
* wait till appcenter displays message that it is succesfully distributed
* noice!