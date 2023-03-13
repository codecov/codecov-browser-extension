export enum CoverageStatus {
  COVERED,
  UNCOVERED,
  PARTIAL,
}

export type FileCoverageReport = {
  [lineNumber: number]: CoverageStatus;
};

export type PullCoverageReport = {
  [fileName: string]: {
    lines: {
      [lineNumber: string]: {
        coverage: {
          head: number;
        };
      };
    };
  };
};

export enum MessageType {
  FETCH_COMMIT_REPORT = "fetch_commit_report",
  FETCH_PR_COMPARISON = "fetch_pr_comparison",
}
