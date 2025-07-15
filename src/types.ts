export type FileMetadata = { [key: string]: string };
export type PRMetadata = { [key: string]: string };

export enum CoverageStatus {
  COVERED,
  UNCOVERED,
  PARTIAL,
}

export type FileCoverageReportResponse = {
  files?: Array<{
    line_coverage: Array<[number, CoverageStatus]>;
  }>;
  commit_file_url: string;
};

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
  CHECK_AUTH = "check_auth",
  FETCH_COMMIT_REPORT = "fetch_commit_report",
  FETCH_PR_COMPARISON = "fetch_pr_comparison",
  FETCH_FLAGS_LIST = "fetch_flags_list",
  FETCH_COMPONENTS_LIST = "fetch_components_list",
  REGISTER_CONTENT_SCRIPTS = "register_content_scripts",
  UNREGISTER_CONTENT_SCRIPTS = "unregister_content_scripts",
  GET_CONSENT = "get_consent",
  SET_CONSENT = "set_consent",
}

export type Consent = "all" | "essential" | "none";
