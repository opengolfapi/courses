"use client";

import { useState } from "react";

interface Tee {
  tee_name: string;
  tee_color: string | null;
  gender: string | null;
  course_rating: number | null;
  slope_rating: number | null;
  par_total: number | null;
  total_yardage: number | null;
}

interface Hole {
  hole_number: number;
  par: number | null;
  handicap_index: number | null;
  yardages: Record<string, number> | null;
}

const TEE_COLORS: Record<string, string> = {
  blue: "bg-blue-600 text-white",
  white: "bg-white text-gray-900 border border-gray-300",
  gold: "bg-yellow-500 text-white",
  yellow: "bg-yellow-400 text-gray-900",
  red: "bg-red-600 text-white",
  black: "bg-black text-white",
  green: "bg-evergreen-600 text-white",
  silver: "bg-gray-400 text-white",
};

const TEE_SELECTED: Record<string, string> = {
  blue: "bg-blue-600 text-white ring-2 ring-blue-300",
  white: "bg-white text-gray-900 border border-gray-300 ring-2 ring-gray-400",
  gold: "bg-yellow-500 text-white ring-2 ring-yellow-300",
  yellow: "bg-yellow-400 text-gray-900 ring-2 ring-yellow-300",
  red: "bg-red-600 text-white ring-2 ring-red-300",
  black: "bg-black text-white ring-2 ring-gray-500",
  green: "bg-evergreen-600 text-white ring-2 ring-cream-darkest",
  silver: "bg-gray-400 text-white ring-2 ring-gray-300",
};

function normalizeTeeKey(teeName: string): string {
  return teeName.toLowerCase().replace(/\s+/g, "_");
}

export function TeeSelector({
  tees,
  holes,
}: {
  tees: Tee[];
  holes: Hole[];
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedTee = tees[selectedIdx];
  const teeKey = selectedTee ? normalizeTeeKey(selectedTee.tee_name) : "";

  const frontNine = holes.filter((h) => h.hole_number <= 9);
  const backNine = holes.filter(
    (h) => h.hole_number > 9 && h.hole_number <= 18
  );

  const getYardage = (hole: Hole): number | null => {
    if (!hole.yardages) return null;
    // Try exact key, then fuzzy match
    const y = hole.yardages as Record<string, number>;
    if (y[teeKey] != null) return y[teeKey];
    // Try matching by tee name case-insensitively
    const match = Object.entries(y).find(
      ([k]) => k.toLowerCase().replace(/\s+/g, "_") === teeKey
    );
    if (match) return match[1];
    // Fallback: first available
    const vals = Object.values(y).filter((v) => typeof v === "number" && v > 0);
    return vals.length > 0 ? vals[0] : null;
  };

  const sumYardage = (holeSet: Hole[]): number =>
    holeSet.reduce((sum, h) => sum + (getYardage(h) ?? 0), 0);
  const sumPar = (holeSet: Hole[]): number =>
    holeSet.reduce((sum, h) => sum + (h.par ?? 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Scorecard</h2>
        <div className="flex flex-wrap gap-2">
          {tees.map((tee, idx) => {
            const color = (tee.tee_color ?? "").toLowerCase();
            const isSelected = idx === selectedIdx;
            const cls = isSelected
              ? TEE_SELECTED[color] ?? "bg-gray-600 text-white ring-2 ring-gray-400"
              : TEE_COLORS[color] ?? "bg-gray-200 text-gray-700";
            return (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${cls}`}
              >
                {tee.tee_name}
                {tee.total_yardage
                  ? ` (${tee.total_yardage.toLocaleString()})`
                  : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tee info */}
      {selectedTee && (
        <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
          {selectedTee.course_rating != null && (
            <div>
              <span className="text-gray-400">Rating: </span>
              <span className="font-medium text-gray-900">
                {selectedTee.course_rating}
              </span>
            </div>
          )}
          {selectedTee.slope_rating != null && (
            <div>
              <span className="text-gray-400">Slope: </span>
              <span className="font-medium text-gray-900">
                {selectedTee.slope_rating}
              </span>
            </div>
          )}
          {selectedTee.gender && (
            <div>
              <span className="text-gray-400">Gender: </span>
              <span className="font-medium text-gray-900">
                {selectedTee.gender}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Scorecard table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
              <th className="py-2 text-left w-16">Hole</th>
              {frontNine.map((h) => (
                <th key={h.hole_number} className="py-2 text-center w-12">
                  {h.hole_number}
                </th>
              ))}
              <th className="py-2 text-center w-14 font-bold text-gray-700">
                Out
              </th>
              {backNine.map((h) => (
                <th key={h.hole_number} className="py-2 text-center w-12">
                  {h.hole_number}
                </th>
              ))}
              {backNine.length > 0 && (
                <th className="py-2 text-center w-14 font-bold text-gray-700">
                  In
                </th>
              )}
              <th className="py-2 text-center w-14 font-bold text-gray-700">
                Tot
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-500 font-medium">Par</td>
              {frontNine.map((h) => (
                <td
                  key={h.hole_number}
                  className="py-2 text-center text-gray-700"
                >
                  {h.par ?? "-"}
                </td>
              ))}
              <td className="py-2 text-center font-bold text-gray-900">
                {sumPar(frontNine)}
              </td>
              {backNine.map((h) => (
                <td
                  key={h.hole_number}
                  className="py-2 text-center text-gray-700"
                >
                  {h.par ?? "-"}
                </td>
              ))}
              {backNine.length > 0 && (
                <td className="py-2 text-center font-bold text-gray-900">
                  {sumPar(backNine)}
                </td>
              )}
              <td className="py-2 text-center font-bold text-gray-900">
                {sumPar(holes)}
              </td>
            </tr>

            {/* Yardage row */}
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-500 font-medium">Yards</td>
              {frontNine.map((h) => (
                <td
                  key={h.hole_number}
                  className="py-2 text-center text-gray-700"
                >
                  {getYardage(h) ?? "-"}
                </td>
              ))}
              <td className="py-2 text-center font-bold text-gray-900">
                {sumYardage(frontNine).toLocaleString()}
              </td>
              {backNine.map((h) => (
                <td
                  key={h.hole_number}
                  className="py-2 text-center text-gray-700"
                >
                  {getYardage(h) ?? "-"}
                </td>
              ))}
              {backNine.length > 0 && (
                <td className="py-2 text-center font-bold text-gray-900">
                  {sumYardage(backNine).toLocaleString()}
                </td>
              )}
              <td className="py-2 text-center font-bold text-gray-900">
                {sumYardage(holes).toLocaleString()}
              </td>
            </tr>

            {/* Handicap row */}
            {holes.some((h) => h.handicap_index != null) && (
              <tr>
                <td className="py-2 text-gray-500 font-medium">HCP</td>
                {frontNine.map((h) => (
                  <td
                    key={h.hole_number}
                    className="py-2 text-center text-gray-500"
                  >
                    {h.handicap_index ?? "-"}
                  </td>
                ))}
                <td className="py-2 text-center" />
                {backNine.map((h) => (
                  <td
                    key={h.hole_number}
                    className="py-2 text-center text-gray-500"
                  >
                    {h.handicap_index ?? "-"}
                  </td>
                ))}
                {backNine.length > 0 && <td className="py-2 text-center" />}
                <td className="py-2 text-center" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
