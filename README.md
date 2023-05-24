### Codecov for GitHub

<img width="1912" alt="image" src="https://user-images.githubusercontent.com/44864521/213549217-bed0071c-c5bc-4a12-944f-31ce15648ab7.png">

```sh
$ web-ext run -s dist -t chromium
```

**Note**: You must be on GitHub's new UI for this extension to perform its magic. ✨  

As of today, GitHub will show you the old UI if not logged in (running in a temporary profile using web-ext).

---

#### Build Instructions

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
