"use client";

import { useActionState } from "react";
import { importCsvAction, type CsvImportState } from "@/app/admin/produtos/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function CsvImportForm() {
  const [state, action] = useActionState<CsvImportState, FormData>(importCsvAction, {});

  return (
    <form action={action} className="max-w-xl space-y-5" noValidate>
      <FormAlert state={state} />
      <div>
        <label htmlFor="csv" className="mb-2 block text-sm text-ivory/85">
          Arquivo CSV
        </label>
        <input id="csv" type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm text-ivory file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink" />
      </div>
      <SubmitButton pendingLabel="Importando..." className="sm:w-auto">
        Importar
      </SubmitButton>

      {state.csvErrors && state.csvErrors.length > 0 && (
        <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-4">
          <p className="mb-2 text-sm text-red-200">{state.csvErrors.length} linha(s) com problema:</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-red-200">
            {state.csvErrors.map((e, i) => (
              <li key={i}>
                Linha {e.line}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
