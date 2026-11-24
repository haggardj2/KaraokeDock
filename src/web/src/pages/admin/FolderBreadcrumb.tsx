import React from "react";
import MaterialIcon from "../../components/MaterialIcon";
import { folderCrumbs } from "./folderPath";

// Where the folder browser is: Media folders › / › media › Karaoke (or D: › Karaoke on Windows).
export default function FolderBreadcrumb({ path, onBrowse }: { path: string; onBrowse: (path: string) => void }) {
  return (
    <div className="browser-path">
      <MaterialIcon name="location_on" />
      <div className="breadcrumb">
        <span className="breadcrumb-part" onClick={() => onBrowse("")}>
          Media folders
        </span>
        {folderCrumbs(path).map((crumb) => (
          <React.Fragment key={crumb.path}>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-part" onClick={() => onBrowse(crumb.path)}>
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
