import React from "react";
import { MultiSelect } from "react-multi-select-component";

import { Site } from "./Content";
import { SEPERATOR } from "../constants";

const ItemRenderer = ({ option, checked, onClick }) => {
  const [repo, name] = option.value.split(SEPERATOR);
  const project = repo.split(".").pop();
  return (
    <button
      className={`block text-left -m-[var(--rmsc-p)] p-3 w-full !box-content ${checked ? "bg-[#4294de]" : ""}`}
      onClick={onClick}
      aria-label={option.label} // Add aria-label for accessibility
    >
      <Site
        className="w-full"
        site={{
          displayName: option.label,
          name: `${project} - ${name}`,
          id: option.id,
          icon: option.icon
        }}
        repo={repo}
        highlight={checked}
      />
    </button>
  );
};

const SiteFilter = ({
  options, selected, onChange
}) => (
  <MultiSelect
    className="w-full"
    options={options}
    value={selected}
    hasSelectAll={false}
    onChange={onChange}
    ItemRenderer={ItemRenderer}
    valueRenderer={(_selected) => _selected.map((option) => {
      const [repo, name] = option.value.split(SEPERATOR);
      const project = repo.split(".").pop();
      return (
        <div className="inline-block">
          <Site
            site={{
              displayName: option.label,
              name: `${project} - ${name}`,
              id: option.id,
              icon: option.icon
            }}
            repo={repo}
          />
        </div>
      );
    })}
  />
);

export default SiteFilter;
