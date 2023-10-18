

const NoLogs = ({ taskPerformed }) => (
  <div>
    {taskPerformed ? "No broken links found! :)" : "You've yet to run the Link Checker task."}
  </div>
);


export default NoLogs;
