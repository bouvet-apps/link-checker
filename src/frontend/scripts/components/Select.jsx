import React from "react";
import { MultiSelect } from "react-multi-select-component";

const ItemRenderer = ({ option, checked, onClick }) => (
  <div className="flex items-center gap-2">
    <input type="radio" checked={checked} onChange={onClick} />
    <span className="block">{option.label}</span>
  </div>
);

const Select = ({
  options, value, onChange
}) => {
  const handleChange = (_selected) => {
    if (_selected.length > 0) {
      onChange(_selected[_selected.length - 1]);
    }
  };

  return (
    <div className="dropdown-single w-48">
      <MultiSelect
        options={options}
        value={[value]}
        disableSearch
        hasSelectAll={false}
        ItemRenderer={ItemRenderer}
        onChange={handleChange}
      />
    </div>
  );
};

export default Select;
