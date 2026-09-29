import { useCallback, useEffect, useState } from "react";
import type { LedgerData, NewAccount, NewCalendarEvent, NewTransaction } from "@/domain/types";
import { repository } from "@/repository/LedgerRepository";

type Status = "loading" | "setup" | "locked" | "ready";

interface LedgerState {
  status: Status;
  data: LedgerData | null;
  error: string | null;
}

/**
 * The one hook the app uses to talk to the repository. It owns the lock/unlock
 * lifecycle and re-renders whenever the encrypted vault changes.
 */
export function useLedger() {
  const [state, setState] = useState<LedgerState>({ status: "loading", data: null, error: null });

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, data: repository.snapshot() }));
  }, []);

  useEffect(() => {
    (async () => {
      const initialized = await repository.isInitialized();
      setState({ status: initialized ? "locked" : "setup", data: null, error: null });
    })();
  }, []);

  const setup = useCallback(async (pin: string) => {
    const data = await repository.initialize(pin);
    setState({ status: "ready", data, error: null });
  }, []);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await repository.unlock(pin);
    if (ok) {
      setState({ status: "ready", data: repository.snapshot(), error: null });
    }
    return ok;
  }, []);

  const lock = useCallback(() => {
    repository.lock();
    setState({ status: "locked", data: null, error: null });
  }, []);

  const reset = useCallback(async () => {
    await repository.reset();
    setState({ status: "setup", data: null, error: null });
  }, []);

  // --- mutations (each re-reads a fresh snapshot afterwards) ---------------
  const addTransaction = useCallback(async (input: NewTransaction) => {
    await repository.addTransaction(input);
    refresh();
  }, [refresh]);

  const updateTransaction = useCallback(async (id: string, patch: NewTransaction) => {
    await repository.updateTransaction(id, patch);
    refresh();
  }, [refresh]);

  const deleteTransaction = useCallback(async (id: string) => {
    await repository.deleteTransaction(id);
    refresh();
  }, [refresh]);

  const importTransactions = useCallback(async (items: NewTransaction[]) => {
    const n = await repository.importTransactions(items);
    refresh();
    return n;
  }, [refresh]);

  const addAccount = useCallback(async (input: NewAccount) => {
    await repository.addAccount(input);
    refresh();
  }, [refresh]);

  const deleteAccount = useCallback(async (id: string) => {
    await repository.deleteAccount(id);
    refresh();
  }, [refresh]);

  const addCategory = useCallback(async (cat: { name: string; type: "income" | "expense"; emoji: string }) => {
    await repository.addCategory(cat);
    refresh();
  }, [refresh]);

  const deleteCategory = useCallback(async (id: string) => {
    await repository.deleteCategory(id);
    refresh();
  }, [refresh]);

  const addDayNote = useCallback(async (input: { date: string; text: string }) => {
    await repository.addDayNote(input);
    refresh();
  }, [refresh]);

  const updateDayNote = useCallback(async (id: string, text: string) => {
    await repository.updateDayNote(id, text);
    refresh();
  }, [refresh]);

  const deleteDayNote = useCallback(async (id: string) => {
    await repository.deleteDayNote(id);
    refresh();
  }, [refresh]);

  const addEvent = useCallback(async (input: NewCalendarEvent) => {
    await repository.addEvent(input);
    refresh();
  }, [refresh]);

  const deleteEvent = useCallback(async (id: string) => {
    await repository.deleteEvent(id);
    refresh();
  }, [refresh]);

  const replaceAll = useCallback(async (data: LedgerData) => {
    await repository.replaceAll(data);
    refresh();
  }, [refresh]);

  const changePin = useCallback(async (current: string, next: string) => {
    return repository.changePin(current, next);
  }, []);

  return {
    ...state,
    setup,
    unlock,
    lock,
    reset,
    changePin,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
    addAccount,
    deleteAccount,
    addCategory,
    deleteCategory,
    addDayNote,
    updateDayNote,
    deleteDayNote,
    addEvent,
    deleteEvent,
    replaceAll,
  };
}
