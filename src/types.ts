export enum CoverageStatus {
  COVERED,
  UNCOVERED,
  PARTIAL,
}

export type CoverageReport = {
  [lineNumber: number]: CoverageStatus;
};

export enum MessageType {
  FETCH_REPORT = "fetch_report",
}
