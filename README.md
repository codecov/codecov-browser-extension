# Codecov Browser Extension for GitHub
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcodecov%2Fcodecov-browser-extension.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcodecov%2Fcodecov-browser-extension?ref=badge_shield)

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


## About this extension 

The Codecov browser extension makes it easy to identify needed test areas by showing you absolute coverage and coverage changes overlaid with your code right in GitHub.

Once installed, get: 

* Line coverage information while viewing commits and single files
* Line coverage information and coverage totals on Pull Requests
* The ability to filter coverage using Flags and Components directly in the GitHub UI 


Pre-requisites: 

* Must use either Firefox or Google Chrome web browsers.

How to enable: 

The extension uses your logged-in session to determine what private repos you have access to. Please make sure to log in to Codecov using your web browser to view coverage data for private repos in GitHub.

## Use with Self-Hosted and Dedicated Cloud Versions of Codecov
You can use this extension against installations of Codecov and GitHub that are:

* Self-hosted
* Part of Codecov's Dedicated Cloud plan

In order to do so you must provide:

* The URL of the Codecov installation
* The URL of your GitHub installation (even if that url is just https://github.com)
* [An API token for Codecov](https://docs.codecov.com/reference/overview)

You can provide this information by using the Settings menu for the Extension in your browser. 

## Running Locally
```sh
$ web-ext run -s dist -t chromium
```

**Note**: You must be on GitHub's new UI for this extension to perform its magic. ✨  

As of today, GitHub will show you the old UI if not logged in (running in a temporary profile using web-ext).

---

## Build Instructions

These steps will build the extension in the `dist/` folder.

MacOS 13.3.1 (22E261)  
NodeJS version 19.8.1

Chrome

```sh
$ npm install
$ npm run build
```

Firefox

```sh
$ npm install
$ npm run build
$ cp dist/manifest.firefox.json dist/manifest.json
```

## About Codecov

[Codecov](https://about.codecov.io) is the all-in-one code coverage reporting solution for any test suite - giving developers actionable insights to deploy reliable code with confidence. 



## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fcodecov%2Fcodecov-browser-extension.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fcodecov%2Fcodecov-browser-extension?ref=badge_large)
