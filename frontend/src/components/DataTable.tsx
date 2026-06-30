import type { ReactNode } from "react";

type Props = {
  headers: string[];
  rows: ReactNode[][];
  rowClassNames?: (string | undefined)[];
};

export function DataTable({ headers, rows, rowClassNames }: Props) {
  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <p className="no-data">No records found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={rowClassNames?.[i] ?? ""}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">Showing {rows.length} records</div>
    </div>
  );
}
