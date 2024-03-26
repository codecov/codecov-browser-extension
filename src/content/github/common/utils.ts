// Note that we're guaranteed to be on a github page due to manifest.json,
// so these checks don't need to include that.
const prUrlRegex = /\/[^\/]+\/[^\/]+\/pull\/\d+\/files.*/
const fileUrlRegex = /\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/.*/

export function isFileUrl(url: string): boolean {
  return fileUrlRegex.test(url);
}

export function isPrUrl(url: string): boolean {
  return prUrlRegex.test(url);
}
