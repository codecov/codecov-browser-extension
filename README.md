# Codecov Browser Extension for GitHub

[![FOSSA Status](https://app.fossa.com/api/projects/custom%2B29430%2Fgithub.com%2Fcodecov%2Fcodecov-browser-extension.svg?type=shield&issueType=license)](https://app.fossa.com/projects/custom%2B29430%2Fgithub.com%2Fcodecov%2Fcodecov-browser-extension?ref=badge_shield&issueType=license)

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/gedikamndpbemklijjkncpnolildpbgo)](https://chrome.google.com/webstore/detail/codecov/gedikamndpbemklijjkncpnolildpbgo)
![Chrome Web Store](https://img.shields.io/chrome-web-store/users/gedikamndpbemklijjkncpnolildpbgo)
![Chrome Web Store](https://img.shields.io/chrome-web-store/rating/gedikamndpbemklijjkncpnolildpbgo)

[![Mozilla Add-on Version](https://img.shields.io/amo/v/%7Bf3924b0d-e29f-4593-b605-084b3d71ed9d%7D)](https://addons.mozilla.org/en-US/firefox/addon/codecov/)
![Mozilla Add-on Users](https://img.shields.io/amo/users/%7Bf3924b0d-e29f-4593-b605-084b3d71ed9d%7D)
![Mozilla Add-on Rating](https://img.shields.io/amo/rating/%7Bf3924b0d-e29f-4593-b605-084b3d71ed9d%7D)

<img width="1912" alt="image" src="https://user-images.githubusercontent.com/44864521/213549217-bed0071c-c5bc-4a12-944f-31ce15648ab7.png">

Automatically see code coverage data and line annotations while browsing files or reviewing pull requests in GitHub.

## Installing

If you wish to simply use the extension, it is available as a [Firefox Add On](https://addons.mozilla.org/en-US/firefox/addon/codecov/) and a [Chrome Extension](https://chrome.google.com/webstore/detail/codecov/gedikamndpbemklijjkncpnolildpbgo).

**Note to Firefox users**: Required permissions must be granted manually on [about:addons](about:addons)

<img width="692" alt="image" src="https://github.com/codecov/codecov-browser-extension/assets/44864521/7db5ba9f-2ac9-46ea-beec-ae22b85290cb">

## About this extension

The Codecov browser extension makes it easy to identify needed test areas by showing you absolute coverage and coverage changes overlaid with your code right in GitHub.

Once installed, you get:

- Line coverage information while viewing commits and single files
- Line coverage information and coverage totals on Pull Requests
- The ability to filter coverage using Flags and Components directly in the GitHub UI

Pre-requisites:

- Must use either the Firefox or Google Chrome web browser.

How to enable:

The extension uses your logged-in session to determine what private repos you have access to. Please make sure to log in to Codecov using your web browser to view coverage data for private repos in GitHub.

## Use with Self-Hosted and Dedicated Cloud Versions of Codecov

You can use this extension against installations of Codecov and GitHub that are:

- Self-hosted
- Part of Codecov's Dedicated Cloud plan

In order to do so you must provide:

- The URL of the Codecov installation
- The URL of your GitHub installation (even if that url is just https://github.com)
- [An API token for Codecov](https://docs.codecov.com/reference/overview)

You can provide this information by using the Settings menu for the Extension in your browser.

<!-- Commenting out this section as the safari extension has been deprioritized -->
<!-- ## Using the Safari extension -->
<!---->
<!-- We have published a Safari port of the extension, but it comes with the caveat that you _must_ use a Codecov API token for the extension to work. -->
<!---->
<!-- To use the extension with a cloud Codecov API token, follow the instructions [above](#use-with-self-hosted-and-dedicated-cloud-versions-of-codecov), but generate the API token in [cloud Codecov](https://app.codecov.io) and use the cloud urls for Codecov's API (`https://api.codecov.io`) and Github (`https://github.com`). Note that this also works on Chrome and Firefox, should you want to do that. -->
<!---->
<!-- We may fix this restriction in the future should the demand exist, but for now, this is just a low effort conversion provided as is. -->

## Running Locally

```sh
$ npm install
# For Chrome
$ npm run start:chrome
# For Firefox
$ npm run start:firefox
```

**Note**: You must be on GitHub's new UI for this extension to perform its magic. ✨

As of today, GitHub will show you the old UI if not logged in (running in a temporary profile using web-ext).

---

## Build Instructions

These steps will build the extension in the `dist/` folder.

### Prerequisites

Node 22, `npm` 10, `git`, and `jq` are required to build the extension.

If you're a reviewer from Mozilla, hi! Please note that we have previously seen differences in build output between AMD64 and ARM64. In our CD pipeline we build on Ubuntu 24.04 AMD64, so please stick to that architecture if possible to eliminate any environment differences.

### Set Local Version

If you're a reviewer from Mozilla, you don't need to do this.

To override the local version of the extension, you can set the `VERSION` environment variable before building. This is useful for testing or development purposes.

E.g.
```sh
$ export VERSION=1.0.0
```

### Use Development Sentry DSN

If you're a reviewer from Mozilla, you don't need to do this.

If you want to use Sentry while developing, you can override the DSN value by first copying the example config (`cp .env.example .env.local`) and then filling in the environment variable.

### Firefox

```sh
$ npm ci
$ npm run build:firefox
```
### Chrome

```sh
$ npm ci
$ npm run build
```

## About Codecov

[Codecov](https://about.codecov.io) is the all-in-one code coverage reporting solution for any test suite - giving developers actionable insights to deploy reliable code with confidence.

## License

[![FOSSA Status](https://app.fossa.com/api/projects/custom%2B29430%2Fgithub.com%2Fcodecov%2Fcodecov-browser-extension.svg?type=large&issueType=license)](https://app.fossa.com/projects/custom%2B29430%2Fgithub.com%2Fcodecov%2Fcodecov-browser-extension?ref=badge_large&issueType=license)
