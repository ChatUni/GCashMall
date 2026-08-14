fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build a signed release AAB via Cordova (auto-bumps versionCode)

### android internal

```sh
[bundle exec] fastlane android internal
```

Build, then upload to the Internal testing track (draft by default)

### android beta

```sh
[bundle exec] fastlane android beta
```

Build, then upload to the Closed testing (beta) track

### android upload_only

```sh
[bundle exec] fastlane android upload_only
```

Upload the already-built AAB to Internal testing (no rebuild)

### android validate

```sh
[bundle exec] fastlane android validate
```

Verify the Play service-account key can authenticate

----


## iOS

### ios build

```sh
[bundle exec] fastlane ios build
```

Build a signed release IPA via Cordova (auto-bumps the TestFlight build number)

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build, then upload to TestFlight (no auto-submit to external testers)

### ios upload_only

```sh
[bundle exec] fastlane ios upload_only
```

Upload the already-built IPA to TestFlight (no rebuild)

### ios validate

```sh
[bundle exec] fastlane ios validate
```

Verify the App Store Connect API key can authenticate

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
