const SORT_FIELDS = {
  NUM_BROKEN: "numBroken",
  SITE: "site",
  MODIFIED: "modified",
  OWNER: "owner"
};

const SORT_OPTIONS = [
  {
    value: SORT_FIELDS.NUM_BROKEN,
    label: "Broken link count"
  },
  {
    value: SORT_FIELDS.SITE,
    label: "Site name"
  },
  {
    value: SORT_FIELDS.MODIFIED,
    label: "Last modified"
  }
  // {
  //   value: SORT_FIELDS.OWNER,
  //   label: "Owner"
  // }
];

const SORT_DIRECTION = {
  ASCENDING: "ascending",
  DESCENDING: "descending"
};

const SEPERATOR = "__";

const ALL = "All";
const ALL_OPTION = {
  label: ALL,
  value: ALL
};

const BRANCHES = {
  DRAFT: "draft",
  MASTER: "master"
};

export {
  SORT_FIELDS,
  SORT_OPTIONS,
  SORT_DIRECTION,
  SEPERATOR,
  ALL,
  ALL_OPTION,
  BRANCHES
};
