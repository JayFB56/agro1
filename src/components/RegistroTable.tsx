import React from "react";
import { Registro as RegistroType } from "../core/types";

export type Registro = RegistroType;

const RegistroTable: React.FC<{ registros: Registro[] }> = ({ registros }) => {
  const sorted = [...registros].sort((a, b) => {
    const [da, ma, ya] = a.fecha.split("/").map(Number);
    const [db, mb, yb] = b.fecha.split("/").map(Number);

    const [ha, mina] = a.hora.split(":").map(Number);
    const [hb, minb] = b.hora.split(":").map(Number);

    const fechaA = new Date(ya, ma - 1, da, ha, mina);
    const fechaB = new Date(yb, mb - 1, db, hb, minb);

    return fechaB.getTime() - fechaA.getTime();
  });

  return (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse shadow-md rounded-lg bg-white">
        <thead>
          <tr className="bg-blue-50">
            <th className="border-b px-3 py-2 text-left font-semibold text-gray-700 text-base">Código</th>
            <th className="border-b px-3 py-2 text-left font-semibold text-gray-700 text-base">Peso (lb)</th>
            <th className="border-b px-3 py-2 text-left font-semibold text-gray-700 text-base">Fecha</th>
            <th className="border-b px-3 py-2 text-left font-semibold text-gray-700 text-base">Hora</th>
            <th className="border-b px-3 py-2 text-left font-semibold text-gray-700 text-base">Turno</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td className="px-3 py-2 text-center text-gray-500" colSpan={5}>
                No hay registros.
              </td>
            </tr>
          )}
          {sorted.map((r, idx) => (
            <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">{r.codigo}</td>
              <td className="px-3 py-2 text-gray-900">{r.peso.toFixed(2)}</td>
              <td className="px-3 py-2 text-gray-900">{r.fecha}</td>
              <td className="px-3 py-2 text-gray-900">{r.hora}</td>
              <td className="px-3 py-2 text-gray-900">{r.turno}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RegistroTable;
