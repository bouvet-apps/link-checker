import { useState } from "react";

const App = ({ logArray }) => {

  const [logs, setLogs] = useState(logArray.sort((a, b) => [].concat(a.brokenLinks).length - [].concat(b.brokenLinks).length))
  const [ascending, setAscending] = useState("descending");


  const sortLogs = (mode) => {
    const newArray = [...logArray];
    newArray.sort((a, b) => {
      switch (mode) {
        case 'site':
          return a.site > b.site ? 1 : -1;
        case 'numBroken':
          return [].concat(a.brokenLinks).length - [].concat(b.brokenLinks).length;
        case 'dateChanged':
          return a.lastModified > b.lastModified ? 1 : -1;
      }
    })
    setLogs(newArray)
  }

  const renderLink = (link) => {
    let brokenLinkTarget = <a href="${link.link}" target="_blank">{link.link}</a>;
    if (link.internal) {
      brokenLinkTarget = <p>{link.link}</p>;
    }
    return (<div key={link.link} className="broken-links-error__link">
      <div className="broken-links-error__link__body">
        <div style={{ marginRight: "5px" }}>{link.type}</div>
        <span style={{ marginRight: "5px" }}>{link.status}</span>
      </div>
      <div className="broken-links-error__link__target">
        {brokenLinkTarget}
      </div>
    </div>)

  };
  return (
    <>
      <div>
        <select  onChange={(e) => sortLogs(e.target.value)}>
          <option value="numBroken"># broken links</option>
          <option value="site">Site</option>
          <option value="dateChanged">Date</option>
        </select>
        <select value={ascending} onChange={(e) => setAscending(e.target.value)}>
          <option value="ascending">Ascending</option>
          <option value="descending">Descending</option>
        </select>
      </div>
      {(ascending === "ascending" ? logs : logs.reverse()).map(result => {
        return <div key={result.path} className="widget-view active internal-widget">
          <div className="widget-item-view properties-widget-item-view">
            <div className="broken-links-error">
              <h3>
                Found {[].concat(result.brokenLinks).length} {([].concat(result.brokenLinks).length > 1 ? "invalid links" : "invalid link")}
              </h3>
              <div>{new Date(Date.parse(result.lastModified)).toString()}</div>
              <h4>{result.displayName} {result.site}</h4>
              <div className="broken-links-error__body">

                {[].concat(result.brokenLinks).map(link => renderLink(link))}


              </div>
            </div>
          </div>
        </div>
      })}
    </>

    // <>
    //   {originalLogs.map(log => (
    //     <div key={log._id}>
    //       <h1 >Log for {log._name}</h1>

    //         {log.results.map((result) => 
    //              <div key={result.path} className="widget-view active internal-widget">
    //               <div className="widget-item-view properties-widget-item-view">
    //                 <div className="broken-links-error">
    //                   <h3>
    //                     Found {[].concat(result.brokenLinks).length} {([].concat(result.brokenLinks).length > 1 ? "invalid links" : "invalid link")}
    //                   </h3>
    //                   <h4>{result.displayName}</h4>
    //                   <div className="broken-links-error__body">

    //                   {[].concat(result.brokenLinks).map(link => renderLink(link))}


    //                   </div>
    //                 </div>
    //               </div>
    //             </div>

    //           )}


    //     </div>
    //   ))}
    // </>
  );
};

export default App;
