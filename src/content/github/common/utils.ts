// Note that we're guaranteed to be on a github page due to manifest.json,
// so these checks don't need to include that.

// This one matches PR files pages. Something like:
// /codecov/gazebo/pull/2435/files
const prUrlRegex = /\/[^\/]+\/[^\/]+\/pull\/\d+\/files.*/

// And this one matches file view pages - which look like:
// /codecov/gazebo/blob/main/src/App.jsx
const fileUrlRegex = /\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/.*/

export function isFileUrl(url: string): boolean {
  return fileUrlRegex.test(url);
}

export function isPrUrl(url: string): boolean {
  return prUrlRegex.test(url);
}
